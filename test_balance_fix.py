import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import simulate_1000x1000 as s
import math, random
from collections import defaultdict

builds = s.generate_1000_builds()

def get_eraser_dimensions(build):
    core = s.CORE_CATALOG[build["coreId"]]
    dock = s.DOCK_PRESETS[build["dockPosition"]]
    w = core["width"] * dock["wMult"]
    h = core["height"] * dock["hMult"]
    return w, h

def get_eraser_corners(cx, cy, w, h, angle):
    half_w = w / 2.0
    half_h = h / 2.0
    cos = math.cos(angle)
    sin = math.sin(angle)
    return [
        (cx + (-half_w * cos - -half_h * sin), cy + (-half_w * sin + -half_h * cos)),
        (cx + (half_w * cos - -half_h * sin),  cy + (half_w * sin + -half_h * cos)),
        (cx + (half_w * cos - half_h * sin),   cy + (half_w * sin + half_h * cos)),
        (cx + (-half_w * cos - half_h * sin),  cy + (-half_w * sin + half_h * cos)),
    ]

def check_obb(e1, e2):
    w1, h1 = get_eraser_dimensions(e1["build"])
    w2, h2 = get_eraser_dimensions(e2["build"])

    c1 = get_eraser_corners(e1["x"], e1["y"], w1, h1, e1["angle"])
    c2 = get_eraser_corners(e2["x"], e2["y"], w2, h2, e2["angle"])

    axes = [
        (math.cos(e1["angle"]), math.sin(e1["angle"])),
        (-math.sin(e1["angle"]), math.cos(e1["angle"])),
        (math.cos(e2["angle"]), math.sin(e2["angle"])),
        (-math.sin(e2["angle"]), math.cos(e2["angle"])),
    ]

    min_overlap = float("inf")
    col_normal = None

    for ax, ay in axes:
        min1 = min(x * ax + y * ay for x, y in c1)
        max1 = max(x * ax + y * ay for x, y in c1)
        min2 = min(x * ax + y * ay for x, y in c2)
        max2 = max(x * ax + y * ay for x, y in c2)

        overlap = min(max1, max2) - max(min1, min2)
        if overlap <= 0:
            return None

        if overlap < min_overlap:
            min_overlap = overlap
            dx = e2["x"] - e1["x"]
            dy = e2["y"] - e1["y"]
            sign = 1 if (dx * ax + dy * ay) >= 0 else -1
            col_normal = (ax * sign, ay * sign)

    return {"overlap": min_overlap, "normal": col_normal}

def simulate_turn_obb(attacker, defender):
    stats_a = attacker["stats"]
    stats_d = defender["stats"]

    dx = defender["x"] - attacker["x"]
    dy = defender["y"] - attacker["y"]
    dist = math.hypot(dx, dy)
    if dist < 1e-4: dist = 1.0; dx, dy = 0, 1

    jitter = (random.random() - 0.5) * 0.12
    base_angle = math.atan2(dy, dx) + jitter
    launch_power = 17.0 + (random.random() * 3.5)

    spd_factor = 0.60 + (stats_a["spd"] / 120.0)
    weight_factor = math.sqrt(20.0 / stats_a["weight"])
    launch_speed = launch_power * spd_factor * weight_factor * 0.62
    attacker["vx"] = math.cos(base_angle) * launch_speed
    attacker["vy"] = math.sin(base_angle) * launch_speed

    friction_a = 0.960 + (stats_a["spd"] * 0.00014) - (stats_a["grip"] * 0.00024)
    friction_d = 0.960 + (stats_d["spd"] * 0.00014) - (stats_d["grip"] * 0.00024)

    for tick in range(120):
        f_a = friction_a
        f_d = friction_d

        if defender["damage"] < 140.0:
            if defender["y"] < s.DESK_Y + 45 or defender["y"] > s.DESK_Y + s.DESK_H - 45 or \
               defender["x"] < s.DESK_X + 45 or defender["x"] > s.DESK_X + s.DESK_W - 45:
                f_d *= 0.90

        if attacker["damage"] < 140.0:
            if attacker["y"] < s.DESK_Y + 45 or attacker["y"] > s.DESK_Y + s.DESK_H - 45 or \
               attacker["x"] < s.DESK_X + 45 or attacker["x"] > s.DESK_X + s.DESK_W - 45:
                f_a *= 0.90

        attacker["x"] += attacker["vx"]
        attacker["y"] += attacker["vy"]
        defender["x"] += defender["vx"]
        defender["y"] += defender["vy"]
        attacker["angle"] += attacker["angVel"]
        defender["angle"] += defender["angVel"]

        attacker["vx"] *= f_a
        attacker["vy"] *= f_a
        defender["vx"] *= f_d
        defender["vy"] *= f_d
        attacker["angVel"] *= 0.95
        defender["angVel"] *= 0.95

        a_out = (attacker["x"] < s.DESK_X_MIN or attacker["x"] > s.DESK_X_MAX or
                 attacker["y"] < s.DESK_Y_MIN or attacker["y"] > s.DESK_Y_MAX)
        d_out = (defender["x"] < s.DESK_X_MIN or defender["x"] > s.DESK_X_MAX or
                 defender["y"] < s.DESK_Y_MIN or defender["y"] > s.DESK_Y_MAX)
        if a_out or d_out:
            return {"ring_out": True, "a_out": a_out, "d_out": d_out}

        # OBB SAT Collision check
        col = check_obb(attacker, defender)
        if col and col["overlap"] > 0.001:
            nx, ny = col["normal"]
            sep = col["overlap"] * 0.51
            attacker["x"] -= nx * sep
            attacker["y"] -= ny * sep
            defender["x"] += nx * sep
            defender["y"] += ny * sep

            rvx = attacker["vx"] - defender["vx"]
            rvy = attacker["vy"] - defender["vy"]
            rel_vel = rvx * nx + rvy * ny

            if rel_vel > 0:
                restitution = 0.72
                base_impulse = (rel_vel * (1.0 + restitution)) / (stats_a["weight"] + stats_d["weight"])

                smash_a = (stats_d["atk"] / 40.0) * rel_vel
                smash_d = (stats_a["atk"] / 40.0) * rel_vel
                attacker["damage"] = min(350.0, attacker["damage"] + smash_a)
                defender["damage"] = min(350.0, defender["damage"] + smash_d)

                def_resist_a = 75.0 / (50.0 + stats_a["def"])
                def_resist_d = 75.0 / (50.0 + stats_d["def"])

                dmg_scale_a = max(0.0, attacker["damage"] - 100.0) / 100.0
                dmg_scale_d = max(0.0, defender["damage"] - 100.0) / 100.0
                smash_mult_a = (0.10 + (dmg_scale_a ** 1.3) * 0.95) * def_resist_a
                smash_mult_d = (0.10 + (dmg_scale_d ** 1.3) * 0.95) * def_resist_d

                attacker["vx"] -= nx * base_impulse * stats_d["weight"] * smash_mult_a * 1.5
                attacker["vy"] -= ny * base_impulse * stats_d["weight"] * smash_mult_a * 1.5
                defender["vx"] += nx * base_impulse * stats_a["weight"] * smash_mult_d * 1.5
                defender["vy"] += ny * base_impulse * stats_a["weight"] * smash_mult_d * 1.5

                # Torque
                arm_x = (defender["x"] - attacker["x"]) * 0.5
                arm_y = (defender["y"] - attacker["y"]) * 0.5
                torque = (arm_x * ny - arm_y * nx) * 0.005
                attacker["angVel"] += torque * smash_mult_a
                defender["angVel"] -= torque * smash_mult_d

        if (math.hypot(attacker["vx"], attacker["vy"]) < 0.08 and
            math.hypot(defender["vx"], defender["vy"]) < 0.08):
            break

    a_out = (attacker["x"] < s.DESK_X_MIN or attacker["x"] > s.DESK_X_MAX or
             attacker["y"] < s.DESK_Y_MIN or attacker["y"] > s.DESK_Y_MAX)
    d_out = (defender["x"] < s.DESK_X_MIN or defender["x"] > s.DESK_X_MAX or
             defender["y"] < s.DESK_Y_MIN or defender["y"] > s.DESK_Y_MAX)
    return {"ring_out": (a_out or d_out), "a_out": a_out, "d_out": d_out}

def play_match_obb(b1, b2, max_turns=24):
    p1 = {"build": b1, "stats": b1["stats"], "x": 500.0, "y": 450.0, "vx": 0.0, "vy": 0.0, "angle": 0.0, "angVel": 0.0, "damage": 100.0}
    p2 = {"build": b2, "stats": b2["stats"], "x": 500.0, "y": 230.0, "vx": 0.0, "vy": 0.0, "angle": math.pi, "angVel": 0.0, "damage": 100.0}
    turn = 0
    while turn < max_turns:
        turn += 1
        if turn % 2 == 1:
            res = simulate_turn_obb(p1, p2)
            if res["ring_out"]:
                if res["d_out"] and not res["a_out"]: return 1, turn
                elif res["a_out"] and not res["d_out"]: return 2, turn
                else: return 2, turn
        else:
            res = simulate_turn_obb(p2, p1)
            if res["ring_out"]:
                if res["d_out"] and not res["a_out"]: return 2, turn
                elif res["a_out"] and not res["d_out"]: return 1, turn
                else: return 1, turn
    return (1 if p1["damage"] < p2["damage"] else 2), turn

TOTAL = 10000
rng = random.Random(42)
p1_wins = 0
turns_dist = defaultdict(int)

for i in range(TOTAL):
    b1 = rng.choice(builds)
    b2 = rng.choice(builds)
    w, t = play_match_obb(b1, b2)
    turns_dist[t] += 1
    if w == 1: p1_wins += 1

print(f"OBB SAT Physics Verification ({TOTAL:,} matches):")
print(f"1P 勝率: {p1_wins/TOTAL*100:.2f}% | 2P 勝率: {(TOTAL-p1_wins)/TOTAL*100:.2f}%")
print(f"1ターンキル率: {turns_dist[1]/TOTAL*100:.2f}% (<= 5% target)")
print(f"平均ターン数: {sum(t*c for t,c in turns_dist.items())/TOTAL:.2f}")
