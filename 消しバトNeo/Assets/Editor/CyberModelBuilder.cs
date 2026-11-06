using UnityEngine;

namespace Cyberasur.Editor
{
    public static class CyberModelBuilder
    {
        public static GameObject BuildStylizedEraser(string name, Material rubberMat, Material sleeveMat, Material neonMat, bool isPlayer)
        {
            GameObject root = new GameObject(name);

            // 1. Main White Elastomer Rubber Block (inner core)
            CreateSubMesh(root.transform, PrimitiveType.Cube, "Rubber_CoreMain",
                Vector3.zero, Quaternion.identity, new Vector3(1.16f, 0.56f, 2.38f), rubberMat);

            // Chamfered top/front/rear bevel strips for authentic rounded eraser edge feel
            CreateSubMesh(root.transform, PrimitiveType.Cube, "Rubber_TopCrown",
                new Vector3(0f, 0.29f, 0f), Quaternion.identity, new Vector3(1.06f, 0.06f, 2.28f), rubberMat);

            CreateSubMesh(root.transform, PrimitiveType.Cylinder, "Rubber_FrontEdgeL",
                new Vector3(-0.52f, 0f, 1.15f), Quaternion.identity, new Vector3(0.14f, 0.28f, 0.14f), rubberMat);
            CreateSubMesh(root.transform, PrimitiveType.Cylinder, "Rubber_FrontEdgeR",
                new Vector3(0.52f, 0f, 1.15f), Quaternion.identity, new Vector3(0.14f, 0.28f, 0.14f), rubberMat);

            // 2. Printed Cardboard Sleeve Jacket wrapping the mid-body
            CreateSubMesh(root.transform, PrimitiveType.Cube, "Sleeve_Jacket",
                new Vector3(0f, 0.01f, -0.08f), Quaternion.identity, new Vector3(1.24f, 0.64f, 1.62f), sleeveMat);

            // 3. Glowing Cyber Energy Trim Strips along the sleeve edges
            CreateSubMesh(root.transform, PrimitiveType.Cube, "Neon_TrimFront",
                new Vector3(0f, 0.01f, 0.73f), Quaternion.identity, new Vector3(1.26f, 0.66f, 0.04f), neonMat);
            CreateSubMesh(root.transform, PrimitiveType.Cube, "Neon_TrimRear",
                new Vector3(0f, 0.01f, -0.89f), Quaternion.identity, new Vector3(1.26f, 0.66f, 0.04f), neonMat);

            // Root Physics Collider
            var boxCol = root.AddComponent<BoxCollider>();
            boxCol.size = new Vector3(1.3f, 0.66f, 2.45f);
            boxCol.center = Vector3.zero;

            return root;
        }

        // Front Weapon: Staple Pile-Bunker (ホッチキス・パイルバンカー)
        public static GameObject BuildStapleRam(Material metalMat, Material neonMat)
        {
            GameObject partRoot = new GameObject("Part_StapleRam");

            // Main heavy staple crown bar
            CreateSubMesh(partRoot.transform, PrimitiveType.Cube, "Staple_CrownBar",
                new Vector3(0f, 0f, 0.16f), Quaternion.identity, new Vector3(1.18f, 0.22f, 0.16f), metalMat);

            // Glowing Plasma Blade Edge
            CreateSubMesh(partRoot.transform, PrimitiveType.Cube, "Staple_PlasmaEdge",
                new Vector3(0f, 0f, 0.26f), Quaternion.identity, new Vector3(1.12f, 0.08f, 0.08f), neonMat);

            // Twin Pneumatic Pile-Bunker Cylinders
            CreateSubMesh(partRoot.transform, PrimitiveType.Cylinder, "Pile_PistonL",
                new Vector3(-0.36f, 0f, 0.02f), Quaternion.Euler(90f, 0f, 0f), new Vector3(0.18f, 0.18f, 0.18f), metalMat);
            CreateSubMesh(partRoot.transform, PrimitiveType.Cylinder, "Pile_PistonR",
                new Vector3(0.36f, 0f, 0.02f), Quaternion.Euler(90f, 0f, 0f), new Vector3(0.18f, 0.18f, 0.18f), metalMat);

            // Outer Staple Fang Prongs
            CreateSubMesh(partRoot.transform, PrimitiveType.Cube, "Staple_FangL",
                new Vector3(-0.56f, 0f, 0.22f), Quaternion.Euler(0f, -12f, 0f), new Vector3(0.1f, 0.2f, 0.34f), metalMat);
            CreateSubMesh(partRoot.transform, PrimitiveType.Cube, "Staple_FangR",
                new Vector3(0.56f, 0f, 0.22f), Quaternion.Euler(0f, 12f, 0f), new Vector3(0.1f, 0.2f, 0.34f), metalMat);

            return partRoot;
        }

        // Side Armor: Paperclip Aegis Shield (ゼムクリップ・イージス装甲)
        public static GameObject BuildPaperclipShield(Material metalMat, Material neonMat, bool isLeft)
        {
            string sideName = isLeft ? "Part_ClipArmor_L" : "Part_ClipArmor_R";
            GameObject clipRoot = new GameObject(sideName);
            float dir = isLeft ? -1f : 1f;

            // Outer Wire Top & Bottom rails
            CreateSubMesh(clipRoot.transform, PrimitiveType.Cylinder, "Wire_TopRail",
                new Vector3(0f, 0.18f, 0f), Quaternion.Euler(90f, 0f, 0f), new Vector3(0.09f, 0.78f, 0.09f), metalMat);
            CreateSubMesh(clipRoot.transform, PrimitiveType.Cylinder, "Wire_BottomRail",
                new Vector3(0f, -0.18f, 0f), Quaternion.Euler(90f, 0f, 0f), new Vector3(0.09f, 0.78f, 0.09f), metalMat);

            // Inner Wire Loop
            CreateSubMesh(clipRoot.transform, PrimitiveType.Cylinder, "Wire_InnerRail",
                new Vector3(dir * 0.03f, 0.05f, 0.1f), Quaternion.Euler(90f, 0f, 0f), new Vector3(0.08f, 0.52f, 0.08f), metalMat);

            // Front & Rear Curved Posts
            CreateSubMesh(clipRoot.transform, PrimitiveType.Cylinder, "Wire_FrontPost",
                new Vector3(0f, 0f, 0.75f), Quaternion.identity, new Vector3(0.1f, 0.2f, 0.1f), metalMat);
            CreateSubMesh(clipRoot.transform, PrimitiveType.Cylinder, "Wire_RearPost",
                new Vector3(0f, 0f, -0.75f), Quaternion.identity, new Vector3(0.1f, 0.2f, 0.1f), metalMat);

            // Glowing Energy Deflector Strip
            CreateSubMesh(clipRoot.transform, PrimitiveType.Cube, "Energy_DeflectorStrip",
                new Vector3(dir * 0.05f, 0f, 0f), Quaternion.identity, new Vector3(0.04f, 0.24f, 1.25f), neonMat);

            return clipRoot;
        }

        // Rear Unit: Twin Tape Dispenser Thrusters (セロテープ・ツインバーニア)
        public static GameObject BuildTapeThruster(Material acrylicMat, Material metalMat, Material neonMat)
        {
            GameObject thrusterRoot = new GameObject("Part_TapeThruster");

            // Central Tape Reel Wheel
            CreateSubMesh(thrusterRoot.transform, PrimitiveType.Cylinder, "Tape_ReelOuter",
                new Vector3(0f, 0.08f, 0f), Quaternion.Euler(0f, 0f, 90f), new Vector3(0.68f, 0.16f, 0.68f), acrylicMat);

            // Inner Hub Core
            CreateSubMesh(thrusterRoot.transform, PrimitiveType.Cylinder, "Tape_ReelHub",
                new Vector3(0f, 0.08f, 0f), Quaternion.Euler(0f, 0f, 90f), new Vector3(0.36f, 0.19f, 0.36f), metalMat);

            // Twin Angled Vernier Nozzles (Left & Right)
            CreateSubMesh(thrusterRoot.transform, PrimitiveType.Cylinder, "Vernier_NozzleL",
                new Vector3(-0.34f, -0.02f, -0.18f), Quaternion.Euler(82f, -15f, 0f), new Vector3(0.28f, 0.16f, 0.28f), metalMat);
            CreateSubMesh(thrusterRoot.transform, PrimitiveType.Cylinder, "Vernier_NozzleR",
                new Vector3(0.34f, -0.02f, -0.18f), Quaternion.Euler(82f, 15f, 0f), new Vector3(0.28f, 0.16f, 0.28f), metalMat);

            // Glowing Plasma Exhaust Cores
            CreateSubMesh(thrusterRoot.transform, PrimitiveType.Sphere, "Exhaust_CoreL",
                new Vector3(-0.37f, -0.02f, -0.3f), Quaternion.identity, new Vector3(0.2f, 0.2f, 0.2f), neonMat);
            CreateSubMesh(thrusterRoot.transform, PrimitiveType.Sphere, "Exhaust_CoreR",
                new Vector3(0.37f, -0.02f, -0.3f), Quaternion.identity, new Vector3(0.2f, 0.2f, 0.2f), neonMat);

            return thrusterRoot;
        }

        // Top Unit: Pushpin Plasma Turret & Needle (画鋲プラズマタレット)
        public static GameObject BuildPushpinLance(Material acrylicMat, Material brassMat, Material neonMat)
        {
            GameObject pinRoot = new GameObject("Part_PushpinLance");

            // Pushpin Base Flange
            CreateSubMesh(pinRoot.transform, PrimitiveType.Cylinder, "Pushpin_BaseFlange",
                new Vector3(0f, 0.05f, 0f), Quaternion.identity, new Vector3(0.54f, 0.06f, 0.54f), acrylicMat);

            // Pushpin Waist Pillar
            CreateSubMesh(pinRoot.transform, PrimitiveType.Cylinder, "Pushpin_Waist",
                new Vector3(0f, 0.18f, 0f), Quaternion.identity, new Vector3(0.28f, 0.12f, 0.28f), acrylicMat);

            // Forward-Aimed Brass Plasma Lance Needle
            CreateSubMesh(pinRoot.transform, PrimitiveType.Cylinder, "Pushpin_BrassLance",
                new Vector3(0f, 0.24f, 0.35f), Quaternion.Euler(90f, 0f, 0f), new Vector3(0.09f, 0.42f, 0.09f), brassMat);

            // Glowing Tip Emitter
            CreateSubMesh(pinRoot.transform, PrimitiveType.Sphere, "Pushpin_PlasmaTip",
                new Vector3(0f, 0.24f, 0.75f), Quaternion.identity, new Vector3(0.13f, 0.13f, 0.13f), neonMat);

            return pinRoot;
        }

        private static GameObject CreateSubMesh(Transform parent, PrimitiveType type, string name, Vector3 localPos, Quaternion localRot, Vector3 localScale, Material mat)
        {
            GameObject obj = GameObject.CreatePrimitive(type);
            obj.name = name;
            obj.transform.SetParent(parent);
            obj.transform.localPosition = localPos;
            obj.transform.localRotation = localRot;
            obj.transform.localScale = localScale;
            obj.GetComponent<Renderer>().sharedMaterial = mat;

            var col = obj.GetComponent<Collider>();
            if (col != null) Object.DestroyImmediate(col);
            return obj;
        }
    }
}
