import math
import random
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ==============================================================================
# Simulation of game.js Battle Engine across 10 Stages
# ==============================================================================

# Typical machine specs sampled from actual PRESET_MACHINES
PRESET_BUILDS = [
    {
        "name": "天翔龍 (Balanced Attacker)",
        "weight": 18.2, "atk": 62, "def": 54, "spd": 60, "grip": 55, "spin": 58,
        "maxLaunchSpeed": 15.5, "friction": 0.958, "restitution": 0.88, "knockbackResist": 1.05,
        "boundingRadius": 42
    },
    {
        "name": "剛鬼城 (Super Heavy Tank)",
        "weight": 28.5, "atk": 52, "def": 78, "spd": 42, "grip": 74, "spin": 38,
        "maxLaunchSpeed": 13.2, "friction": 0.950, "restitution": 0.78, "knockbackResist": 1.28,
        "boundingRadius": 46
    },
    {
        "name": "疾風迅雷 (High-Speed Skirmisher)",
        "weight": 12.8, "atk": 70, "def": 40, "spd": 82, "grip": 48, "spin": 72,
        "maxLaunchSpeed": 17.8, "friction": 0.966, "restitution": 0.95, "knockbackResist": 0.88,
        "boundingRadius": 38
    },
    {
        "name": "渦潮双刃 (Spin Specialist)",
        "weight": 16.5, "atk": 58, "def": 50, "spd": 64, "grip": 58, "spin": 80,
        "maxLaunchSpeed": 16.0, "friction": 0.960, "restitution": 0.86, "knockbackResist": 1.00,
        "boundingRadius": 40
    }
]

STAGE_CONFIGS = [
    {"id": "standard", "name": "STAGE 01: スタンダード木製机", "frictionMul": 1.0, "wMult": 1.0, "hMult": 1.0, "isRound": False, "startSuddenDeath": 0},
    {"id": "stationery", "name": "STAGE 02: 定規文房具ギミック机", "frictionMul": 1.0, "wMult": 1.0, "hMult": 1.0, "isRound": False, "startSuddenDeath": 0},
    {"id": "pinball", "name": "STAGE 03: ピンボールバンパー机", "frictionMul": 0.95, "wMult": 1.05, "hMult": 1.0, "isRound": False, "startSuddenDeath": 0},
    {"id": "bridge", "name": "STAGE 04: 天王山・一本橋アリーナ", "frictionMul": 1.0, "wMult": 0.55, "hMult": 1.15, "isRound": False, "startSuddenDeath": 0},
    {"id": "colosseum", "name": "STAGE 05: 円形コロシアム机", "frictionMul": 1.0, "wMult": 0.92, "hMult": 0.92, "isRound": True, "startSuddenDeath": 0},
    {"id": "crossroad", "name": "STAGE 06: 十字路クロスアリーナ", "frictionMul": 1.0, "wMult": 1.05, "hMult": 1.05, "isRound": False, "startSuddenDeath": 0},
    {"id": "islands", "name": "STAGE 07: ツイン浮島・超加速ハイウェイ", "frictionMul": 1.0, "wMult": 1.12, "hMult": 0.88, "isRound": False, "startSuddenDeath": 0},
    {"id": "gridlock", "name": "STAGE 08: 迷路ペンシルヘッジ", "frictionMul": 0.98, "wMult": 1.05, "hMult": 1.05, "isRound": False, "startSuddenDeath": 0},
    {"id": "ice_glass", "name": "STAGE 09: 超低摩擦ガラステーブル", "frictionMul": 0.38, "wMult": 1.0, "hMult": 1.0, "isRound": False, "startSuddenDeath": 0},
    {"id": "volcano", "name": "STAGE 10: 崩落縮小ボルケーノ", "frictionMul": 1.0, "wMult": 0.90, "hMult": 0.90, "isRound": False, "startSuddenDeath": 28}
]

def get_desk_bounds(stg, sudden_death_shrink=0):
    w, h = 900, 560
    base_w = min(w * 0.78, 760) * stg["wMult"]
    base_h = min(h * 0.74, 520) * stg["hMult"]
    dw = max(180, base_w - sudden_death_shrink * 2)
    dh = max(180, base_h - sudden_death_shrink * 2)
    cx, cy = w * 0.5, h * 0.5
    radius = (min(dw, dh) * 0.5) if stg["isRound"] else 0
    return {
        "cx": cx, "cy": cy,
        "width": dw, "height": dh,
        "left": cx - dw * 0.5, "right": cx + dw * 0.5,
        "top": cy - dh * 0.5, "bottom": cy + dh * 0.5,
        "isRound": stg["isRound"],
        "radius": radius
    }

def get_stage_gimmicks(stg_id, desk):
    obstacles = []
    bumpers = []
    boost_pads = []
    spin_pads = []
    friction_zones = []

    if stg_id == 'stationery':
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.38, 'y': desk['cy'], 'w': 18, 'h': 140, 'angle': 0})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.38, 'y': desk['cy'], 'w': 18, 'h': 140, 'angle': 0})
        boost_pads.append({'id': 'bp1', 'x': desk['cx'] - desk['width'] * 0.36, 'y': desk['cy'] + desk['height'] * 0.16, 'w': 42, 'h': 68, 'angle': -math.pi * 0.45, 'boostForce': 7.2})
        boost_pads.append({'id': 'bp2', 'x': desk['cx'] + desk['width'] * 0.36, 'y': desk['cy'] - desk['height'] * 0.16, 'w': 42, 'h': 68, 'angle': math.pi * 0.55, 'boostForce': 7.2})
    elif stg_id == 'pinball':
        bumpers.append({'x': desk['cx'] - desk['width'] * 0.40, 'y': desk['cy'], 'r': 24})
        bumpers.append({'x': desk['cx'] + desk['width'] * 0.40, 'y': desk['cy'], 'r': 24})
        bumpers.append({'x': desk['cx'] - desk['width'] * 0.36, 'y': desk['cy'] - desk['height'] * 0.34, 'r': 22})
        bumpers.append({'x': desk['cx'] + desk['width'] * 0.36, 'y': desk['cy'] + desk['height'] * 0.34, 'r': 22})
        spin_pads.append({'id': 'sp_pb', 'x': desk['cx'], 'y': desk['cy'], 'r': 36, 'spinForce': 0.16, 'vortexForce': 0.7})
    elif stg_id == 'bridge':
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'], 'w': desk['width'] * 0.65, 'h': 72, 'angle': 0, 'frictionMul': 0.68})
        boost_pads.append({'id': 'bp_br1', 'x': desk['cx'], 'y': desk['cy'] + desk['height'] * 0.14, 'w': 55, 'h': 44, 'angle': -math.pi / 2, 'boostForce': 7.6})
        boost_pads.append({'id': 'bp_br2', 'x': desk['cx'], 'y': desk['cy'] - desk['height'] * 0.14, 'w': 55, 'h': 44, 'angle': math.pi / 2, 'boostForce': 7.6})
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.42, 'y': desk['cy'], 'w': 10, 'h': 86, 'angle': 0})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.42, 'y': desk['cy'], 'w': 10, 'h': 86, 'angle': 0})
    elif stg_id == 'colosseum':
        spin_pads.append({'id': 'sp_col', 'x': desk['cx'], 'y': desk['cy'], 'r': desk['width'] * 0.22, 'spinForce': 0.14, 'vortexForce': 0.85})
        friction_zones.append({'x': desk['cx'] - desk['width'] * 0.32, 'y': desk['cy'] - desk['height'] * 0.18, 'w': 55, 'h': 44, 'angle': 0.3, 'frictionMul': 0.70})
        friction_zones.append({'x': desk['cx'] + desk['width'] * 0.32, 'y': desk['cy'] + desk['height'] * 0.18, 'w': 55, 'h': 44, 'angle': 0.3, 'frictionMul': 0.70})
    elif stg_id == 'crossroad':
        bx = desk['width'] * 0.40
        by = desk['height'] * 0.38
        obstacles.extend([
            {'x': desk['cx'] - bx, 'y': desk['cy'] - by, 'w': 36, 'h': 36, 'angle': 0},
            {'x': desk['cx'] + bx, 'y': desk['cy'] - by, 'w': 36, 'h': 36, 'angle': 0},
            {'x': desk['cx'] - bx, 'y': desk['cy'] + by, 'w': 36, 'h': 36, 'angle': 0},
            {'x': desk['cx'] + bx, 'y': desk['cy'] + by, 'w': 36, 'h': 36, 'angle': 0}
        ])
        boost_pads.extend([
            {'id': 'bp_cr1', 'x': desk['cx'], 'y': desk['cy'] + desk['height'] * 0.18, 'w': 48, 'h': 42, 'angle': -math.pi / 2, 'boostForce': 8.0},
            {'id': 'bp_cr2', 'x': desk['cx'], 'y': desk['cy'] - desk['height'] * 0.18, 'w': 48, 'h': 42, 'angle': math.pi / 2, 'boostForce': 8.0},
            {'id': 'bp_cr3', 'x': desk['cx'] - desk['width'] * 0.20, 'y': desk['cy'], 'w': 42, 'h': 48, 'angle': 0, 'boostForce': 8.0},
            {'id': 'bp_cr4', 'x': desk['cx'] + desk['width'] * 0.20, 'y': desk['cy'], 'w': 42, 'h': 48, 'angle': math.pi, 'boostForce': 8.0}
        ])
        spin_pads.append({'id': 'sp_cr', 'x': desk['cx'], 'y': desk['cy'], 'r': 28, 'spinForce': 0.18, 'vortexForce': 0.6})
    elif stg_id == 'islands':
        boost_pads.append({'id': 'bp_isl1', 'x': desk['cx'] - 24, 'y': desk['cy'] + desk['height'] * 0.12, 'w': 44, 'h': 64, 'angle': -math.pi * 0.48, 'boostForce': 9.5})
        boost_pads.append({'id': 'bp_isl2', 'x': desk['cx'] + 24, 'y': desk['cy'] - desk['height'] * 0.12, 'w': 44, 'h': 64, 'angle': math.pi * 0.52, 'boostForce': 9.5})
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.18, 'y': desk['cy'], 'w': 12, 'h': 96, 'angle': 0})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.18, 'y': desk['cy'], 'w': 12, 'h': 96, 'angle': 0})
        spin_pads.append({'id': 'sp_isl', 'x': desk['cx'], 'y': desk['cy'], 'r': 26, 'spinForce': 0.20, 'vortexForce': 0.7})
    elif stg_id == 'gridlock':
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.18, 'y': desk['cy'] - 12, 'w': 14, 'h': 90, 'angle': 0.25})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.18, 'y': desk['cy'] + 12, 'w': 14, 'h': 90, 'angle': -0.25})
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'], 'w': 72, 'h': 58, 'angle': 0, 'frictionMul': 0.68})
        boost_pads.append({'id': 'bp_gr1', 'x': desk['cx'] - desk['width'] * 0.36, 'y': desk['cy'] + desk['height'] * 0.10, 'w': 38, 'h': 62, 'angle': -math.pi / 2, 'boostForce': 7.5})
        boost_pads.append({'id': 'bp_gr2', 'x': desk['cx'] + desk['width'] * 0.36, 'y': desk['cy'] - desk['height'] * 0.10, 'w': 38, 'h': 62, 'angle': math.pi / 2, 'boostForce': 7.5})
    elif stg_id == 'ice_glass':
        friction_zones.append({'x': desk['cx'] - desk['width'] * 0.20, 'y': desk['cy'], 'w': 74, 'h': 74, 'angle': 0, 'frictionMul': 0.64})
        friction_zones.append({'x': desk['cx'] + desk['width'] * 0.20, 'y': desk['cy'], 'w': 74, 'h': 74, 'angle': 0, 'frictionMul': 0.64})
        spin_pads.append({'id': 'sp_ice', 'x': desk['cx'], 'y': desk['cy'], 'r': 30, 'spinForce': 0.15, 'vortexForce': 0.85})
    elif stg_id == 'volcano':
        bumpers.append({'x': desk['cx'], 'y': desk['cy'], 'r': 24})
        boost_pads.append({'id': 'bp_vol1', 'x': desk['cx'] - desk['width'] * 0.10, 'y': desk['cy'] + desk['height'] * 0.08, 'w': 42, 'h': 54, 'angle': -math.pi * 0.35, 'boostForce': 8.0})
        boost_pads.append({'id': 'bp_vol2', 'x': desk['cx'] + desk['width'] * 0.10, 'y': desk['cy'] - desk['height'] * 0.08, 'w': 42, 'h': 54, 'angle': math.pi * 0.65, 'boostForce': 8.0})
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'] + desk['height'] * 0.16, 'w': 60, 'h': 36, 'angle': 0, 'frictionMul': 0.72})
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'] - desk['height'] * 0.16, 'w': 60, 'h': 36, 'angle': 0, 'frictionMul': 0.72})

    return obstacles, bumpers, boost_pads, spin_pads, friction_zones

def run_single_match(stg_config, build_p1, build_p2):
    desk = get_desk_bounds(stg_config, 0)
    obstacles, bumpers, boost_pads, spin_pads, friction_zones = get_stage_gimmicks(stg_config["id"], desk)

    # Unit 1 (bottom left)
    u1 = {
        "id": 1,
        "x": desk['cx'] - desk['width'] * 0.22,
        "y": desk['bottom'] - desk['height'] * 0.24,
        "vx": 0.0, "vy": 0.0, "angVel": 0.0,
        "damagePct": 100, "fallen": False,
        "spec": build_p1,
        "boostCooldown": 0, "lastBoostPadId": None
    }

    # Unit 2 (top right)
    u2 = {
        "id": 2,
        "x": desk['cx'] + desk['width'] * 0.22,
        "y": desk['top'] + desk['height'] * 0.24,
        "vx": 0.0, "vy": 0.0, "angVel": 0.0,
        "damagePct": 100, "fallen": False,
        "spec": build_p2,
        "boostCooldown": 0, "lastBoostPadId": None
    }

    turn = 1
    max_turns = 35
    active_player = 1
    sudden_death_shrink = stg_config["startSuddenDeath"]

    # Telemetry
    total_collisions = 0
    total_gimmick_triggers = 0
    last_hit_by_unit = {1: False, 2: False} # was the last push by the opponent unit?

    while turn <= max_turns:
        # Check sudden death
        if turn >= 20 and sudden_death_shrink == 0:
            sudden_death_shrink = 20
        elif sudden_death_shrink > 0:
            sudden_death_shrink += 8

        desk = get_desk_bounds(stg_config, sudden_death_shrink)

        # Active player aims & launches
        shooter = u1 if active_player == 1 else u2
        target = u2 if active_player == 1 else u1

        dx = target["x"] - shooter["x"]
        dy = target["y"] - shooter["y"]
        dist = math.hypot(dx, dy)
        jitter = (random.random() - 0.5) * 0.16
        aim_angle = math.atan2(dy, dx) + jitter

        edge_safe = 0.68 if (target["x"] < desk['left'] + 80 or target["x"] > desk['right'] - 80 or target["y"] < desk['top'] + 80 or target["y"] > desk['bottom'] - 80) else 0.80
        power_ratio = min(0.88, max(0.48, (dist / 360.0) * edge_safe))
        launch_spd = max(2.5, power_ratio * shooter["spec"]["maxLaunchSpeed"])

        shooter["vx"] = math.cos(aim_angle) * launch_spd
        shooter["vy"] = math.sin(aim_angle) * launch_spd

        # Physics loop for this shot
        stage_friction_mul = stg_config["frictionMul"]

        for tick in range(130):
            any_moving = False

            for u in [u1, u2]:
                if u["fallen"]: continue
                u["x"] += u["vx"]
                u["y"] += u["vy"]

                raw_friction = min(0.978, u["spec"]["friction"])
                decel = (1.0 - raw_friction) * stage_friction_mul
                eff_friction = max(0.85, min(0.988, 1.0 - decel))

                u["vx"] *= eff_friction
                u["vy"] *= eff_friction

                if math.hypot(u["vx"], u["vy"]) < 0.09:
                    u["vx"] = 0.0
                    u["vy"] = 0.0
                else:
                    any_moving = True

                # --- Gimmick 1: High-Friction Zones ---
                for fz in friction_zones:
                    hw = fz["w"] * 0.5
                    hh = fz["h"] * 0.5
                    if abs(u["x"] - fz["x"]) <= hw + 10 and abs(u["y"] - fz["y"]) <= hh + 10:
                        u["vx"] *= fz["frictionMul"]
                        u["vy"] *= fz["frictionMul"]
                        total_gimmick_triggers += 1

                # --- Gimmick 2: Spin Pads ---
                for sp in spin_pads:
                    d = math.hypot(u["x"] - sp["x"], u["y"] - sp["y"])
                    if d <= sp["r"] + 12:
                        u["angVel"] += sp["spinForce"]
                        if d > 2:
                            nx = -(u["y"] - sp["y"]) / d
                            ny = (u["x"] - sp["x"]) / d
                            u["vx"] += nx * sp["vortexForce"]
                            u["vy"] += ny * sp["vortexForce"]
                        total_gimmick_triggers += 1

                # --- Gimmick 3: Boost Pads ---
                if u["boostCooldown"] > 0:
                    u["boostCooldown"] -= 1
                else:
                    u["lastBoostPadId"] = None

                for bp in boost_pads:
                    hw = bp["w"] * 0.5
                    hh = bp["h"] * 0.5
                    if abs(u["x"] - bp["x"]) <= hw + 12 and abs(u["y"] - bp["y"]) <= hh + 12:
                        if u["lastBoostPadId"] != bp["id"] or u["boostCooldown"] <= 0:
                            u["lastBoostPadId"] = bp["id"]
                            u["boostCooldown"] = 16
                            bx = math.cos(bp["angle"])
                            by = math.sin(bp["angle"])
                            u["vx"] = u["vx"] * 0.45 + bx * bp["boostForce"]
                            u["vy"] = u["vy"] * 0.45 + by * bp["boostForce"]
                            total_gimmick_triggers += 1
                            last_hit_by_unit[u["id"]] = False # Was accelerated by gimmick!

                # --- Bumpers ---
                for b in bumpers:
                    bdx = u["x"] - b["x"]
                    bdy = u["y"] - b["y"]
                    bdist = math.hypot(bdx, bdy)
                    if bdist < b["r"] + 20 and bdist > 0.05:
                        bnx = bdx / bdist
                        bny = bdy / bdist
                        spd = max(6.5, math.hypot(u["vx"], u["vy"]) * 1.15)
                        u["vx"] = bnx * spd
                        u["vy"] = bny * spd
                        total_gimmick_triggers += 1
                        last_hit_by_unit[u["id"]] = False

                # --- Obstacles ---
                for obs in obstacles:
                    hw = obs["w"] * 0.5
                    hh = obs["h"] * 0.5
                    if abs(u["x"] - obs["x"]) < hw + 18 and abs(u["y"] - obs["y"]) < hh + 18:
                        u["vx"] = -u["vx"] * 0.84
                        u["vy"] = -u["vy"] * 0.84
                        total_gimmick_triggers += 1

            # --- Unit-to-Unit Collision ---
            if not u1["fallen"] and not u2["fallen"]:
                udx = u2["x"] - u1["x"]
                udy = u2["y"] - u1["y"]
                udist = math.hypot(udx, udy)
                min_r = (u1["spec"]["boundingRadius"] + u2["spec"]["boundingRadius"]) * 0.82

                if udist < min_r:
                    unx = udx / (udist or 1.0)
                    uny = udy / (udist or 1.0)
                    sep = (min_r - udist) * 0.6 + 0.6
                    u1["x"] -= unx * sep
                    u1["y"] -= uny * sep
                    u2["x"] += unx * sep
                    u2["y"] += uny * sep

                    rvx = u2["vx"] - u1["vx"]
                    rvy = u2["vy"] - u1["vy"]
                    vel_norm = rvx * unx + rvy * uny

                    if vel_norm < 0:
                        e = min(1.05, (u1["spec"]["restitution"] + u2["spec"]["restitution"]) * 0.5)
                        m1 = u1["spec"]["weight"] * u1["spec"]["knockbackResist"]
                        m2 = u2["spec"]["weight"] * u2["spec"]["knockbackResist"]

                        j_imp = -(1 + e) * vel_norm / (1.0 / m1 + 1.0 / m2)
                        turn_cap = 0.78 if turn == 1 else 1.0
                        imp1 = (u2["damagePct"] / 100.0) * turn_cap
                        imp2 = (u1["damagePct"] / 100.0) * turn_cap

                        u1["vx"] -= (j_imp * unx / m1) * imp1
                        u1["vy"] -= (j_imp * uny / m1) * imp1
                        u2["vx"] += (j_imp * unx / m2) * imp2
                        u2["vy"] += (j_imp * uny / m2) * imp2

                        # Damage
                        dmg = max(4.0, abs(j_imp) * 0.45)
                        u1["damagePct"] += dmg
                        u2["damagePct"] += dmg

                        total_collisions += 1
                        last_hit_by_unit[1] = True
                        last_hit_by_unit[2] = True

            # --- Ring-out Check ---
            for u in [u1, u2]:
                if u["fallen"]: continue
                if desk["isRound"]:
                    is_out = math.hypot(u["x"] - desk["cx"], u["y"] - desk["cy"]) > desk["radius"]
                else:
                    is_out = (u["x"] < desk["left"] or u["x"] > desk["right"] or u["y"] < desk["top"] or u["y"] > desk["bottom"])

                if is_out:
                    u["fallen"] = True

            if u1["fallen"] or u2["fallen"]:
                break

            if not any_moving:
                break

        # Check winner
        if u1["fallen"] and u2["fallen"]:
            return {"winner": 0, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "double_ko"}
        elif u1["fallen"]:
            cause = "unit_push" if last_hit_by_unit[1] else "gimmick_suicide"
            return {"winner": 2, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": cause}
        elif u2["fallen"]:
            cause = "unit_push" if last_hit_by_unit[2] else "gimmick_suicide"
            return {"winner": 1, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": cause}

        turn += 1
        active_player = 2 if active_player == 1 else 1

    # Timeout / Tiebreaker
    if u1["damagePct"] < u2["damagePct"]:
        return {"winner": 1, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "timeout_damage"}
    elif u2["damagePct"] < u1["damagePct"]:
        return {"winner": 2, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "timeout_damage"}
    else:
        return {"winner": 0, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "timeout_draw"}

def simulate_1000_per_stage():
    print("=" * 80)
    print("RUNNING 1000-MATCH LARGE-SCALE MONTE CARLO SIMULATION ACROSS ALL 10 STAGES")
    print("Total Matches: 10,000 matches (1,000 matches per stage)")
    print("=" * 80)

    results_by_stage = {}

    for stg in STAGE_CONFIGS:
        sid = stg["id"]
        p1_wins = 0
        p2_wins = 0
        draws = 0
        turns_list = []
        collisions_list = []
        gimmicks_list = []
        unit_push_kos = 0
        gimmick_suicide_kos = 0
        timeouts = 0

        t0 = time.time()
        for i in range(1000):
            # Pick random presets
            b1 = random.choice(PRESET_BUILDS)
            b2 = random.choice(PRESET_BUILDS)
            res = run_single_match(stg, b1, b2)

            if res["winner"] == 1:
                p1_wins += 1
            elif res["winner"] == 2:
                p2_wins += 1
            else:
                draws += 1

            turns_list.append(res["turn"])
            collisions_list.append(res["collisions"])
            gimmicks_list.append(res["gimmick_triggers"])

            if res["cause"] == "unit_push":
                unit_push_kos += 1
            elif res["cause"] == "gimmick_suicide":
                gimmick_suicide_kos += 1
            elif "timeout" in res["cause"]:
                timeouts += 1

        elapsed = time.time() - t0
        avg_turns = sum(turns_list) / len(turns_list)
        avg_colls = sum(collisions_list) / len(collisions_list)
        avg_gimms = sum(gimmicks_list) / len(gimmicks_list)
        total_kos = unit_push_kos + gimmick_suicide_kos or 1
        unit_ko_pct = (unit_push_kos / total_kos) * 100.0
        gimmick_ko_pct = (gimmick_suicide_kos / total_kos) * 100.0

        results_by_stage[sid] = {
            "name": stg["name"],
            "p1_win_rate": p1_wins / 10.0,
            "p2_win_rate": p2_wins / 10.0,
            "draw_rate": draws / 10.0,
            "avg_turns": avg_turns,
            "avg_colls": avg_colls,
            "avg_gimms": avg_gimms,
            "unit_ko_pct": unit_ko_pct,
            "gimmick_ko_pct": gimmick_ko_pct,
            "timeouts": timeouts
        }

        print(f"[{stg['name']}] (1000 matches in {elapsed:.2f}s)")
        print(f"  P1 Win Rate: {p1_wins/10.0:.1f}% | P2 Win Rate: {p2_wins/10.0:.1f}% | Draws: {draws/10.0:.1f}%")
        print(f"  Avg Turns: {avg_turns:.2f} | Timeouts (>30 turns): {timeouts}")
        print(f"  Avg Collisions: {avg_colls:.2f} vs Avg Gimmick Triggers: {avg_gimms:.2f}")
        print(f"  KO Causation: 消しゴム同士の激突 KO = {unit_ko_pct:.1f}% | ギミック暴走/事故死 KO = {gimmick_ko_pct:.1f}%")
        print("-" * 80)

    return results_by_stage

if __name__ == '__main__':
    simulate_1000_per_stage()
