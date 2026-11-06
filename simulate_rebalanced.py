import math
import random
import time
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

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
    {"id": "bridge", "name": "STAGE 04: 天王山・一本橋アリーナ", "frictionMul": 1.0, "wMult": 0.65, "hMult": 1.15, "isRound": False, "startSuddenDeath": 0},
    {"id": "colosseum", "name": "STAGE 05: 円形コロシアム机", "frictionMul": 1.0, "wMult": 1.05, "hMult": 1.05, "isRound": True, "startSuddenDeath": 0},
    {"id": "crossroad", "name": "STAGE 06: 十字路クロスアリーナ", "frictionMul": 1.0, "wMult": 1.05, "hMult": 1.05, "isRound": False, "startSuddenDeath": 0},
    {"id": "islands", "name": "STAGE 07: ツイン浮島・超加速ハイウェイ", "frictionMul": 1.0, "wMult": 1.12, "hMult": 0.90, "isRound": False, "startSuddenDeath": 0},
    {"id": "gridlock", "name": "STAGE 08: 迷路ペンシルヘッジ", "frictionMul": 0.98, "wMult": 1.05, "hMult": 1.05, "isRound": False, "startSuddenDeath": 0},
    {"id": "ice_glass", "name": "STAGE 09: 超低摩擦ガラステーブル", "frictionMul": 0.78, "wMult": 1.0, "hMult": 1.0, "isRound": False, "startSuddenDeath": 0},
    {"id": "volcano", "name": "STAGE 10: 崩落縮小ボルケーノ", "frictionMul": 1.0, "wMult": 0.92, "hMult": 0.92, "isRound": False, "startSuddenDeath": 24}
]

def get_desk_bounds(stg, sudden_death_shrink=0):
    w, h = 900, 560
    base_w = min(w * 0.78, 760) * stg["wMult"]
    base_h = min(h * 0.74, 520) * stg["hMult"]
    dw = max(200, base_w - sudden_death_shrink * 2)
    dh = max(200, base_h - sudden_death_shrink * 2)
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
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.38, 'y': desk['cy'], 'w': 18, 'h': 130, 'angle': 0})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.38, 'y': desk['cy'], 'w': 18, 'h': 130, 'angle': 0})
        boost_pads.append({'id': 'bp1', 'x': desk['cx'] - desk['width'] * 0.36, 'y': desk['cy'] + desk['height'] * 0.16, 'w': 38, 'h': 60, 'angle': -math.pi * 0.45, 'boostForce': 2.8})
        boost_pads.append({'id': 'bp2', 'x': desk['cx'] + desk['width'] * 0.36, 'y': desk['cy'] - desk['height'] * 0.16, 'w': 38, 'h': 60, 'angle': math.pi * 0.55, 'boostForce': 2.8})
    elif stg_id == 'pinball':
        bumpers.append({'x': desk['cx'] - desk['width'] * 0.40, 'y': desk['cy'], 'r': 22})
        bumpers.append({'x': desk['cx'] + desk['width'] * 0.40, 'y': desk['cy'], 'r': 22})
        bumpers.append({'x': desk['cx'] - desk['width'] * 0.36, 'y': desk['cy'] - desk['height'] * 0.34, 'r': 20})
        bumpers.append({'x': desk['cx'] + desk['width'] * 0.36, 'y': desk['cy'] + desk['height'] * 0.34, 'r': 20})
        # Gentle turntable
        spin_pads.append({'id': 'sp_pb', 'x': desk['cx'], 'y': desk['cy'], 'r': 32, 'spinForce': 0.04, 'vortexForce': 0.14})
    elif stg_id == 'bridge':
        # Moderate friction zone (not sticky glue!)
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'], 'w': desk['width'] * 0.60, 'h': 60, 'angle': 0, 'frictionMul': 0.92})
        boost_pads.append({'id': 'bp_br1', 'x': desk['cx'], 'y': desk['cy'] + desk['height'] * 0.16, 'w': 46, 'h': 40, 'angle': -math.pi / 2, 'boostForce': 3.2})
        boost_pads.append({'id': 'bp_br2', 'x': desk['cx'], 'y': desk['cy'] - desk['height'] * 0.16, 'w': 46, 'h': 40, 'angle': math.pi / 2, 'boostForce': 3.2})
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.44, 'y': desk['cy'], 'w': 10, 'h': 80, 'angle': 0})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.44, 'y': desk['cy'], 'w': 10, 'h': 80, 'angle': 0})
    elif stg_id == 'colosseum':
        # Moderate center turntable
        spin_pads.append({'id': 'sp_col', 'x': desk['cx'], 'y': desk['cy'], 'r': desk['width'] * 0.12, 'spinForce': 0.035, 'vortexForce': 0.12})
        friction_zones.append({'x': desk['cx'] - desk['width'] * 0.32, 'y': desk['cy'] - desk['height'] * 0.18, 'w': 48, 'h': 40, 'angle': 0.3, 'frictionMul': 0.92})
        friction_zones.append({'x': desk['cx'] + desk['width'] * 0.32, 'y': desk['cy'] + desk['height'] * 0.18, 'w': 48, 'h': 40, 'angle': 0.3, 'frictionMul': 0.92})
    elif stg_id == 'crossroad':
        bx = desk['width'] * 0.40
        by = desk['height'] * 0.38
        obstacles.extend([
            {'x': desk['cx'] - bx, 'y': desk['cy'] - by, 'w': 34, 'h': 34, 'angle': 0},
            {'x': desk['cx'] + bx, 'y': desk['cy'] - by, 'w': 34, 'h': 34, 'angle': 0},
            {'x': desk['cx'] - bx, 'y': desk['cy'] + by, 'w': 34, 'h': 34, 'angle': 0},
            {'x': desk['cx'] + bx, 'y': desk['cy'] + by, 'w': 34, 'h': 34, 'angle': 0}
        ])
        boost_pads.extend([
            {'id': 'bp_cr1', 'x': desk['cx'], 'y': desk['cy'] + desk['height'] * 0.18, 'w': 42, 'h': 38, 'angle': -math.pi / 2, 'boostForce': 3.0},
            {'id': 'bp_cr2', 'x': desk['cx'], 'y': desk['cy'] - desk['height'] * 0.18, 'w': 42, 'h': 38, 'angle': math.pi / 2, 'boostForce': 3.0},
            {'id': 'bp_cr3', 'x': desk['cx'] - desk['width'] * 0.20, 'y': desk['cy'], 'w': 38, 'h': 42, 'angle': 0, 'boostForce': 3.0},
            {'id': 'bp_cr4', 'x': desk['cx'] + desk['width'] * 0.20, 'y': desk['cy'], 'w': 38, 'h': 42, 'angle': math.pi, 'boostForce': 3.0}
        ])
        spin_pads.append({'id': 'sp_cr', 'x': desk['cx'], 'y': desk['cy'], 'r': 26, 'spinForce': 0.04, 'vortexForce': 0.14})
    elif stg_id == 'islands':
        # Controlled boost pads (3.2 impulse, assists forward dive rather than instant drop)
        boost_pads.append({'id': 'bp_isl1', 'x': desk['cx'] - 24, 'y': desk['cy'] + desk['height'] * 0.14, 'w': 38, 'h': 54, 'angle': -math.pi * 0.48, 'boostForce': 3.4})
        boost_pads.append({'id': 'bp_isl2', 'x': desk['cx'] + 24, 'y': desk['cy'] - desk['height'] * 0.14, 'w': 38, 'h': 54, 'angle': math.pi * 0.52, 'boostForce': 3.4})
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.20, 'y': desk['cy'], 'w': 12, 'h': 88, 'angle': 0})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.20, 'y': desk['cy'], 'w': 12, 'h': 88, 'angle': 0})
        spin_pads.append({'id': 'sp_isl', 'x': desk['cx'], 'y': desk['cy'], 'r': 24, 'spinForce': 0.04, 'vortexForce': 0.15})
    elif stg_id == 'gridlock':
        obstacles.append({'x': desk['cx'] - desk['width'] * 0.18, 'y': desk['cy'] - 12, 'w': 14, 'h': 85, 'angle': 0.25})
        obstacles.append({'x': desk['cx'] + desk['width'] * 0.18, 'y': desk['cy'] + 12, 'w': 14, 'h': 85, 'angle': -0.25})
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'], 'w': 65, 'h': 50, 'angle': 0, 'frictionMul': 0.92})
        boost_pads.append({'id': 'bp_gr1', 'x': desk['cx'] - desk['width'] * 0.36, 'y': desk['cy'] + desk['height'] * 0.12, 'w': 36, 'h': 52, 'angle': -math.pi / 2, 'boostForce': 3.0})
        boost_pads.append({'id': 'bp_gr2', 'x': desk['cx'] + desk['width'] * 0.36, 'y': desk['cy'] - desk['height'] * 0.12, 'w': 36, 'h': 52, 'angle': math.pi / 2, 'boostForce': 3.0})
    elif stg_id == 'ice_glass':
        friction_zones.append({'x': desk['cx'] - desk['width'] * 0.20, 'y': desk['cy'], 'w': 68, 'h': 68, 'angle': 0, 'frictionMul': 0.88})
        friction_zones.append({'x': desk['cx'] + desk['width'] * 0.20, 'y': desk['cy'], 'w': 68, 'h': 68, 'angle': 0, 'frictionMul': 0.88})
        spin_pads.append({'id': 'sp_ice', 'x': desk['cx'], 'y': desk['cy'], 'r': 28, 'spinForce': 0.035, 'vortexForce': 0.15})
    elif stg_id == 'volcano':
        bumpers.append({'x': desk['cx'], 'y': desk['cy'], 'r': 24})
        boost_pads.append({'id': 'bp_vol1', 'x': desk['cx'] - desk['width'] * 0.12, 'y': desk['cy'] + desk['height'] * 0.08, 'w': 38, 'h': 46, 'angle': -math.pi * 0.35, 'boostForce': 3.2})
        boost_pads.append({'id': 'bp_vol2', 'x': desk['cx'] + desk['width'] * 0.12, 'y': desk['cy'] - desk['height'] * 0.08, 'w': 38, 'h': 46, 'angle': math.pi * 0.65, 'boostForce': 3.2})
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'] + desk['height'] * 0.16, 'w': 54, 'h': 32, 'angle': 0, 'frictionMul': 0.92})
        friction_zones.append({'x': desk['cx'], 'y': desk['cy'] - desk['height'] * 0.16, 'w': 54, 'h': 32, 'angle': 0, 'frictionMul': 0.92})

    return obstacles, bumpers, boost_pads, spin_pads, friction_zones

def run_single_match(stg_config, build_p1, build_p2):
    desk = get_desk_bounds(stg_config, 0)
    obstacles, bumpers, boost_pads, spin_pads, friction_zones = get_stage_gimmicks(stg_config["id"], desk)

    u1 = {
        "id": 1,
        "x": desk['cx'] - desk['width'] * 0.22,
        "y": desk['bottom'] - desk['height'] * 0.24,
        "vx": 0.0, "vy": 0.0, "angVel": 0.0,
        "damagePct": 100, "fallen": False,
        "spec": build_p1,
        "boostCooldown": 0, "lastBoostPadId": None
    }

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
    max_turns = 30
    active_player = 1
    sudden_death_shrink = stg_config["startSuddenDeath"]

    total_collisions = 0
    total_gimmick_triggers = 0
    last_hit_by_unit = {1: False, 2: False}

    while turn <= max_turns:
        if turn >= 18 and sudden_death_shrink == 0:
            sudden_death_shrink = 18
        elif sudden_death_shrink > 0:
            sudden_death_shrink += 8

        desk = get_desk_bounds(stg_config, sudden_death_shrink)

        shooter = u1 if active_player == 1 else u2
        target = u2 if active_player == 1 else u1

        dx = target["x"] - shooter["x"]
        dy = target["y"] - shooter["y"]
        dist = math.hypot(dx, dy)
        jitter = (random.random() - 0.5) * 0.14
        aim_angle = math.atan2(dy, dx) + jitter

        edge_safe = 0.72 if (target["x"] < desk['left'] + 80 or target["x"] > desk['right'] - 80 or target["y"] < desk['top'] + 80 or target["y"] > desk['bottom'] - 80) else 0.82
        power_ratio = min(0.88, max(0.48, (dist / 360.0) * edge_safe))
        launch_spd = max(2.5, power_ratio * shooter["spec"]["maxLaunchSpeed"])
        if turn == 1:
            launch_spd *= 0.72  # First-turn initiative damper

        shooter["vx"] = math.cos(aim_angle) * launch_spd
        shooter["vy"] = math.sin(aim_angle) * launch_spd

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

                # --- Balanced Gimmick 1: High-Friction Zones (moderate extra drag) ---
                for fz in friction_zones:
                    hw = fz["w"] * 0.5
                    hh = fz["h"] * 0.5
                    if abs(u["x"] - fz["x"]) <= hw + 8 and abs(u["y"] - fz["y"]) <= hh + 8:
                        u["vx"] *= fz["frictionMul"]
                        u["vy"] *= fz["frictionMul"]
                        total_gimmick_triggers += 1

                # --- Balanced Gimmick 2: Spin Pads (gentle torque, mass-scaled) ---
                for sp in spin_pads:
                    d = math.hypot(u["x"] - sp["x"], u["y"] - sp["y"])
                    if d <= sp["r"] + 10:
                        grip_factor = 1.0 - (u["spec"]["grip"] - 45) * 0.005
                        u["angVel"] += sp["spinForce"] * grip_factor
                        if d > 2:
                            nx = -(u["y"] - sp["y"]) / d
                            ny = (u["x"] - sp["x"]) / d
                            u["vx"] += nx * sp["vortexForce"] * grip_factor
                            u["vy"] += ny * sp["vortexForce"] * grip_factor
                        total_gimmick_triggers += 1

                # --- Balanced Gimmick 3: Boost Pads (additive mass-scaled impulse) ---
                if u["boostCooldown"] > 0:
                    u["boostCooldown"] -= 1
                else:
                    u["lastBoostPadId"] = None

                for bp in boost_pads:
                    hw = bp["w"] * 0.5
                    hh = bp["h"] * 0.5
                    if abs(u["x"] - bp["x"]) <= hw + 10 and abs(u["y"] - bp["y"]) <= hh + 10:
                        if u["lastBoostPadId"] != bp["id"] or u["boostCooldown"] <= 0:
                            u["lastBoostPadId"] = bp["id"]
                            u["boostCooldown"] = 18
                            mass_scale = 18.0 / max(10.0, u["spec"]["weight"])
                            impulse = bp["boostForce"] * mass_scale * 0.75
                            bx = math.cos(bp["angle"])
                            by = math.sin(bp["angle"])
                            # Additive boost rather than replacing momentum
                            u["vx"] += bx * impulse
                            u["vy"] += by * impulse
                            # Cap speed to prevent tunnelling
                            cur_spd = math.hypot(u["vx"], u["vy"])
                            if cur_spd > 20.0:
                                u["vx"] = (u["vx"] / cur_spd) * 20.0
                                u["vy"] = (u["vy"] / cur_spd) * 20.0
                            total_gimmick_triggers += 1

                # --- Balanced Bumpers (momentum-respecting bounce) ---
                for b in bumpers:
                    bdx = u["x"] - b["x"]
                    bdy = u["y"] - b["y"]
                    bdist = math.hypot(bdx, bdy)
                    if bdist < b["r"] + 18 and bdist > 0.05:
                        bnx = bdx / bdist
                        bny = bdy / bdist
                        in_spd = math.hypot(u["vx"], u["vy"])
                        out_spd = max(in_spd * 0.82, min(5.0, in_spd * 1.05 + 0.5))
                        u["vx"] = bnx * out_spd
                        u["vy"] = bny * out_spd
                        total_gimmick_triggers += 1

                # --- Obstacles ---
                for obs in obstacles:
                    hw = obs["w"] * 0.5
                    hh = obs["h"] * 0.5
                    if abs(u["x"] - obs["x"]) < hw + 16 and abs(u["y"] - obs["y"]) < hh + 16:
                        u["vx"] = -u["vx"] * 0.82
                        u["vy"] = -u["vy"] * 0.82
                        total_gimmick_triggers += 1

            # --- Unit-to-Unit Collision (Dominant Factor) ---
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

                        dmg = max(5.0, abs(j_imp) * 0.52)
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

            # Wait until complete stop before breaking tick loop!
            if not any_moving:
                break

        if u1["fallen"] and u2["fallen"]:
            # Both fell: player whose turn it was loses (self-destruct)!
            double_winner = 2 if active_player == 1 else 1
            return {"winner": double_winner, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "double_ringout_suicide"}
        elif u1["fallen"]:
            cause = "unit_push" if last_hit_by_unit[1] else "gimmick_suicide"
            return {"winner": 2, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": cause}
        elif u2["fallen"]:
            cause = "unit_push" if last_hit_by_unit[2] else "gimmick_suicide"
            return {"winner": 1, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": cause}

        turn += 1
        active_player = 2 if active_player == 1 else 1

    if u1["damagePct"] < u2["damagePct"]:
        return {"winner": 1, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "timeout_damage"}
    elif u2["damagePct"] < u1["damagePct"]:
        return {"winner": 2, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "timeout_damage"}
    else:
        return {"winner": 0, "turn": turn, "collisions": total_collisions, "gimmick_triggers": total_gimmick_triggers, "cause": "timeout_draw"}

def simulate_1000_per_stage():
    print("=" * 80)
    print("REBALANCED SIMULATION: 10,000 MATCHES (1,000 PER STAGE)")
    print("=" * 80)

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

        print(f"[{stg['name']}] (1000 matches in {elapsed:.2f}s)")
        print(f"  P1 Win Rate: {p1_wins/10.0:.1f}% | P2 Win Rate: {p2_wins/10.0:.1f}% | Draws: {draws/10.0:.1f}%")
        print(f"  Avg Turns: {avg_turns:.2f} | Timeouts (>30 turns): {timeouts}")
        print(f"  Avg Collisions: {avg_colls:.2f} vs Avg Gimmick Triggers: {avg_gimms:.2f}")
        print(f"  KO Causation: 消しゴム同士の激突 KO = {unit_ko_pct:.1f}% | ギミック暴走/事故死 KO = {gimmick_ko_pct:.1f}%")
        print("-" * 80)

if __name__ == '__main__':
    simulate_1000_per_stage()
