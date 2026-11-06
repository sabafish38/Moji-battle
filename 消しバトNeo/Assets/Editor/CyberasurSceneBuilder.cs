using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Cyberasur.Core;
using Cyberasur.FX;
using Cyberasur.AI;
using Cyberasur.UI;

namespace Cyberasur.Editor
{
    [InitializeOnLoad]
    public static class CyberasurSceneBuilder
    {
        private const string SceneBuiltKey = "Cyberasur_TurnBased_Stylized_v6";

        static CyberasurSceneBuilder()
        {
            EditorApplication.delayCall += () =>
            {
                if (!EditorApplication.isPlayingOrWillChangePlaymode && !SessionState.GetBool(SceneBuiltKey, false))
                {
                    SessionState.SetBool(SceneBuiltKey, true);
                    BuildBattleArena();
                }
            };
        }

        [MenuItem("Tools/Cyberasur/⚡ Build Complete Battle Arena", false, 1)]
        public static void BuildBattleArena()
        {
            if (EditorApplication.isPlaying) return;

            Debug.Log("[CYBERASUR] 🎨 Constructing Maximum-Quality Stylized Eraser Battle Arena...");

            EnsureFolders();

            Shader litShader = Shader.Find("Universal Render Pipeline/Lit");
            if (litShader == null) litShader = Shader.Find("Standard");

            // 1. Generate High-Detail Procedural Textures
            Texture2D playerSleeveTex = CyberTextureGenerator.GenerateEraserSleeveTexture(true);
            CyberTextureGenerator.SaveTexture(playerSleeveTex, "Art/Textures/Tex_Sleeve_Player.png");
            playerSleeveTex = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Art/Textures/Tex_Sleeve_Player.png");

            Texture2D enemySleeveTex = CyberTextureGenerator.GenerateEraserSleeveTexture(false);
            CyberTextureGenerator.SaveTexture(enemySleeveTex, "Art/Textures/Tex_Sleeve_Enemy.png");
            enemySleeveTex = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Art/Textures/Tex_Sleeve_Enemy.png");

            Texture2D deskGridTex = CyberTextureGenerator.GenerateDeskGridTexture();
            CyberTextureGenerator.SaveTexture(deskGridTex, "Art/Textures/Tex_Desk_Grid.png");
            deskGridTex = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Art/Textures/Tex_Desk_Grid.png");

            // 2. Create Materials
            Material matRubber = CreateLitMaterial("Assets/Materials/Mat_RubberWhite.mat", litShader, new Color(0.95f, 0.96f, 0.98f), 0.3f, 0.02f);
            Material matPlayerSleeve = CreateLitMaterial("Assets/Materials/Mat_PlayerSleeve.mat", litShader, Color.white, 0.78f, 0.15f, null, playerSleeveTex);
            Material matEnemySleeve = CreateLitMaterial("Assets/Materials/Mat_EnemySleeve.mat", litShader, Color.white, 0.78f, 0.15f, null, enemySleeveTex);
            Material matDesk = CreateLitMaterial("Assets/Materials/Mat_DeskSurface.mat", litShader, Color.white, 0.68f, 0.22f, null, deskGridTex);
            Material matDeskBezel = CreateLitMaterial("Assets/Materials/Mat_DeskBezel.mat", litShader, new Color(0.06f, 0.08f, 0.12f), 0.6f, 0.5f);
            Material matMetal = CreateLitMaterial("Assets/Materials/Mat_MetalChrome.mat", litShader, new Color(0.88f, 0.91f, 0.96f), 0.92f, 0.92f, new Color(0.15f, 0.25f, 0.35f));
            Material matBrass = CreateLitMaterial("Assets/Materials/Mat_BrassGold.mat", litShader, new Color(1f, 0.78f, 0.22f), 0.9f, 0.88f, new Color(0.9f, 0.55f, 0.1f));
            Material matNeonCyan = CreateLitMaterial("Assets/Materials/Mat_NeonCyan.mat", litShader, new Color(0.1f, 0.95f, 1f), 0.95f, 0.1f, new Color(0f, 0.85f, 1f) * 2.8f);
            Material matNeonMagenta = CreateLitMaterial("Assets/Materials/Mat_NeonMagenta.mat", litShader, new Color(1f, 0.15f, 0.45f), 0.95f, 0.1f, new Color(1f, 0.15f, 0.45f) * 2.8f);
            Material matAcrylic = CreateLitMaterial("Assets/Materials/Mat_AcrylicCyan.mat", litShader, new Color(0.15f, 0.82f, 1f), 0.92f, 0.2f, new Color(0f, 0.45f, 0.85f));

            // Create Low-Friction PhysicsMaterial
            PhysicsMaterial slickPhysMat = AssetDatabase.LoadAssetAtPath<PhysicsMaterial>("Assets/Materials/Phys_CyberSlick.physicMaterial");
            if (slickPhysMat == null)
            {
                slickPhysMat = new PhysicsMaterial("Phys_CyberSlick")
                {
                    dynamicFriction = 0.06f,
                    staticFriction = 0.06f,
                    bounciness = 0.38f,
                    frictionCombine = PhysicsMaterialCombine.Minimum,
                    bounceCombine = PhysicsMaterialCombine.Maximum
                };
                AssetDatabase.CreateAsset(slickPhysMat, "Assets/Materials/Phys_CyberSlick.physicMaterial");
            }

            AssetDatabase.SaveAssets();

            // 3. Clean up any old scene objects
            DestroyIfFound("Cube");
            DestroyIfFound("Desk_Root");
            DestroyIfFound("Desk");
            DestroyIfFound("Player_Eraser");
            DestroyIfFound("Enemy_Eraser");
            DestroyIfFound("DeskArenaManager");
            DestroyIfFound("TurnBattleManager");
            DestroyIfFound("FX_Manager");
            DestroyIfFound("BattleHUD");

            // 4. Build Detailed Cyber-Desk Arena
            BuildDeskArenaHierarchy(matDesk, matDeskBezel, matAcrylic, matNeonCyan, matBrass, slickPhysMat);

            // 5. Managers (FX, Audio, HUD, Turn System)
            GameObject fxMgr = new GameObject("FX_Manager");
            fxMgr.AddComponent<CameraShaker>();
            fxMgr.AddComponent<HitStopManager>();
            fxMgr.AddComponent<ImpactEffectSpawner>();
            fxMgr.AddComponent<CyberAudioSynthesizer>();

            GameObject hudObj = new GameObject("BattleHUD");
            hudObj.AddComponent<BattleHUD>();

            GameObject turnMgrObj = new GameObject("TurnBattleManager");
            turnMgrObj.AddComponent<TurnBattleManager>();
            turnMgrObj.AddComponent<DeskArenaManager>();

            // 6. Build Player Eraser (MONO-EX01 Cyber Custom)
            Vector3 spawnP = new Vector3(-4.6f, 0.65f, 0f);
            Quaternion rotP = Quaternion.Euler(0f, 90f, 0f);
            GameObject player = CyberModelBuilder.BuildStylizedEraser("Player_Eraser", matRubber, matPlayerSleeve, matNeonCyan, true);
            player.transform.position = spawnP;
            player.transform.rotation = rotP;
            player.GetComponent<Collider>().sharedMaterial = slickPhysMat;

            var pRb = player.AddComponent<Rigidbody>();
            pRb.mass = 1.35f;
            pRb.linearDamping = 1.15f;
            pRb.angularDamping = 2.0f;
            pRb.interpolation = RigidbodyInterpolation.Interpolate;
            pRb.collisionDetectionMode = CollisionDetectionMode.Continuous;

            player.AddComponent<EraserStats>();
            player.AddComponent<BumperPhysics>();
            player.AddComponent<TurnPlayerController>();
            var pSlot = player.AddComponent<EraserPartSlot>();

            AttachPart(player, CyberModelBuilder.BuildStapleRam(matMetal, matNeonCyan), new Vector3(0f, 0f, 1.25f), Quaternion.identity, SlotType.Front, pSlot);
            AttachPart(player, CyberModelBuilder.BuildPaperclipShield(matMetal, matNeonCyan, true), new Vector3(-0.72f, 0f, 0f), Quaternion.identity, SlotType.Side, pSlot);
            AttachPart(player, CyberModelBuilder.BuildPaperclipShield(matMetal, matNeonCyan, false), new Vector3(0.72f, 0f, 0f), Quaternion.identity, SlotType.Side, pSlot);
            AttachPart(player, CyberModelBuilder.BuildTapeThruster(matAcrylic, matMetal, matNeonCyan), new Vector3(0f, 0.04f, -1.28f), Quaternion.identity, SlotType.Rear, pSlot);
            AttachPart(player, CyberModelBuilder.BuildPushpinLance(matAcrylic, matBrass, matNeonCyan), new Vector3(0f, 0.34f, 0.1f), Quaternion.identity, SlotType.Top, pSlot);

            // 7. Build Enemy Eraser (RED-HAZARD RX Custom)
            Vector3 spawnE = new Vector3(4.6f, 0.65f, 0f);
            Quaternion rotE = Quaternion.Euler(0f, -90f, 0f);
            GameObject enemy = CyberModelBuilder.BuildStylizedEraser("Enemy_Eraser", matRubber, matEnemySleeve, matNeonMagenta, false);
            enemy.transform.position = spawnE;
            enemy.transform.rotation = rotE;
            enemy.GetComponent<Collider>().sharedMaterial = slickPhysMat;

            var eRb = enemy.AddComponent<Rigidbody>();
            eRb.mass = 1.35f;
            eRb.linearDamping = 1.15f;
            eRb.angularDamping = 2.0f;
            eRb.interpolation = RigidbodyInterpolation.Interpolate;
            eRb.collisionDetectionMode = CollisionDetectionMode.Continuous;

            enemy.AddComponent<EraserStats>();
            enemy.AddComponent<BumperPhysics>();
            enemy.AddComponent<TurnEnemyAI>();
            var eSlot = enemy.AddComponent<EraserPartSlot>();

            AttachPart(enemy, CyberModelBuilder.BuildStapleRam(matMetal, matNeonMagenta), new Vector3(0f, 0f, 1.25f), Quaternion.identity, SlotType.Front, eSlot);
            AttachPart(enemy, CyberModelBuilder.BuildPaperclipShield(matMetal, matNeonMagenta, true), new Vector3(-0.72f, 0f, 0f), Quaternion.identity, SlotType.Side, eSlot);
            AttachPart(enemy, CyberModelBuilder.BuildPaperclipShield(matMetal, matNeonMagenta, false), new Vector3(0.72f, 0f, 0f), Quaternion.identity, SlotType.Side, eSlot);
            AttachPart(enemy, CyberModelBuilder.BuildTapeThruster(matBrass, matMetal, matNeonMagenta), new Vector3(0f, 0.04f, -1.28f), Quaternion.identity, SlotType.Rear, eSlot);
            AttachPart(enemy, CyberModelBuilder.BuildPushpinLance(matBrass, matMetal, matNeonMagenta), new Vector3(0f, 0.34f, 0.1f), Quaternion.identity, SlotType.Top, eSlot);

            // 8. Configure Main Camera (Behind-Player Stage Overhead View 自機後方からのステージ俯瞰固定視点)
            Camera mainCam = Camera.main;
            if (mainCam != null)
            {
                // ゲーム開始時の自機 (-X側) の後ろから、前方の敵 (+X側) と机全体を見渡す俯瞰アングル
                mainCam.transform.position = new Vector3(-13.2f, 10.8f, 0f);
                mainCam.transform.rotation = Quaternion.Euler(40f, 90f, 0f);
                mainCam.clearFlags = CameraClearFlags.SolidColor;
                mainCam.backgroundColor = new Color(0.03f, 0.04f, 0.08f, 1f);

                var follow = mainCam.GetComponent<SmoothFollowCamera>();
                if (follow == null) follow = mainCam.gameObject.AddComponent<SmoothFollowCamera>();
                follow.ApplyFixedOverheadView();
            }

            // 9. Configure Lighting
            var dirLight = GameObject.Find("Directional Light");
            if (dirLight != null)
            {
                dirLight.transform.rotation = Quaternion.Euler(52f, -32f, 0f);
                var lightComp = dirLight.GetComponent<Light>();
                if (lightComp != null)
                {
                    lightComp.intensity = 1.45f;
                    lightComp.color = new Color(0.95f, 0.98f, 1f);
                }
            }

            EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
            EditorSceneManager.SaveOpenScenes();

            Debug.Log("[CYBERASUR] ✅ Maximum-Quality Arena Built & Saved! Press Play (▶) to Battle!");
        }

        private static void BuildDeskArenaHierarchy(Material matDesk, Material matBezel, Material matRuler, Material matNeon, Material matGold, PhysicsMaterial slickMat)
        {
            GameObject deskRoot = new GameObject("Desk_Root");

            // Main Tabletop (16 x 11 units, open drop-off edges for ring-outs!)
            GameObject deskTop = GameObject.CreatePrimitive(PrimitiveType.Cube);
            deskTop.name = "Desk_Surface";
            deskTop.transform.SetParent(deskRoot.transform);
            deskTop.transform.position = new Vector3(0f, -0.3f, 0f);
            deskTop.transform.localScale = new Vector3(16f, 0.6f, 11f);
            deskTop.GetComponent<Renderer>().sharedMaterial = matDesk;
            deskTop.GetComponent<Collider>().sharedMaterial = slickMat;

            // Under-Desk Cyber Frame & Legs (Flush below Y=0 so they never block Ring-Outs!)
            CreateDecor(deskRoot.transform, PrimitiveType.Cube, "UnderFrame", new Vector3(0f, -0.75f, 0f), new Vector3(15.2f, 0.35f, 10.2f), matBezel);
            CreateDecor(deskRoot.transform, PrimitiveType.Cylinder, "DeskLeg_FL", new Vector3(-7.2f, -4.5f, -4.8f), new Vector3(0.45f, 4.0f, 0.45f), matBezel);
            CreateDecor(deskRoot.transform, PrimitiveType.Cylinder, "DeskLeg_FR", new Vector3(7.2f, -4.5f, -4.8f), new Vector3(0.45f, 4.0f, 0.45f), matBezel);
            CreateDecor(deskRoot.transform, PrimitiveType.Cylinder, "DeskLeg_BL", new Vector3(-7.2f, -4.5f, 4.8f), new Vector3(0.45f, 4.0f, 0.45f), matBezel);
            CreateDecor(deskRoot.transform, PrimitiveType.Cylinder, "DeskLeg_BR", new Vector3(7.2f, -4.5f, 4.8f), new Vector3(0.45f, 4.0f, 0.45f), matBezel);

            // Tactical Stationery Obstacle 1: 30cm Cyber Acrylic Ruler at Top-Center (Bank-Shot Bounce Wall!)
            GameObject ruler = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ruler.name = "Prop_Ruler30cm";
            ruler.transform.SetParent(deskRoot.transform);
            ruler.transform.position = new Vector3(0f, 0.18f, 3.8f);
            ruler.transform.localScale = new Vector3(6.8f, 0.36f, 0.65f);
            ruler.GetComponent<Renderer>().sharedMaterial = matRuler;
            ruler.GetComponent<Collider>().sharedMaterial = slickMat;

            // Tactical Stationery Obstacle 2 & 3: Glue Stick Bumper Pillars (High-Bounce Bumpers!)
            CreateBumperPillar(deskRoot.transform, "Prop_GlueBumper_L", new Vector3(-3.2f, 0.35f, -3.4f), matGold, matNeon, slickMat);
            CreateBumperPillar(deskRoot.transform, "Prop_GlueBumper_R", new Vector3(3.2f, 0.35f, -3.4f), matGold, matNeon, slickMat);
        }

        private static void CreateDecor(Transform parent, PrimitiveType type, string name, Vector3 pos, Vector3 scale, Material mat)
        {
            GameObject obj = GameObject.CreatePrimitive(type);
            obj.name = name;
            obj.transform.SetParent(parent);
            obj.transform.position = pos;
            obj.transform.localScale = scale;
            obj.GetComponent<Renderer>().sharedMaterial = mat;
            Object.DestroyImmediate(obj.GetComponent<Collider>());
        }

        private static void CreateBumperPillar(Transform parent, string name, Vector3 pos, Material bodyMat, Material ringMat, PhysicsMaterial slickMat)
        {
            GameObject pillar = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pillar.name = name;
            pillar.transform.SetParent(parent);
            pillar.transform.position = pos;
            pillar.transform.localScale = new Vector3(1.1f, 0.35f, 1.1f);
            pillar.GetComponent<Renderer>().sharedMaterial = bodyMat;
            pillar.GetComponent<Collider>().sharedMaterial = slickMat;

            GameObject glowRing = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            glowRing.name = "Bumper_GlowRing";
            glowRing.transform.SetParent(pillar.transform);
            glowRing.transform.localPosition = Vector3.zero;
            glowRing.transform.localScale = new Vector3(1.08f, 0.3f, 1.08f);
            glowRing.GetComponent<Renderer>().sharedMaterial = ringMat;
            Object.DestroyImmediate(glowRing.GetComponent<Collider>());
        }

        private static void AttachPart(GameObject eraser, GameObject partObj, Vector3 localPos, Quaternion localRot, SlotType slot, EraserPartSlot slotMgr)
        {
            partObj.transform.SetParent(eraser.transform);
            partObj.transform.localPosition = localPos;
            partObj.transform.localRotation = localRot;

            var ep = partObj.AddComponent<EraserPart>();
            ep.partName = partObj.name;
            ep.slotType = slot;
            slotMgr.RegisterPart(ep);
        }

        private static Material CreateLitMaterial(string path, Shader shader, Color color, float smoothness, float metallic, Color? emission = null, Texture2D mainTex = null)
        {
            Material mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null)
            {
                mat = new Material(shader);
                AssetDatabase.CreateAsset(mat, path);
            }

            mat.SetColor("_BaseColor", color);
            mat.SetFloat("_Smoothness", smoothness);
            mat.SetFloat("_Metallic", metallic);
            if (mainTex != null)
            {
                mat.SetTexture("_BaseMap", mainTex);
            }
            if (emission.HasValue)
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", emission.Value);
            }
            EditorUtility.SetDirty(mat);
            return mat;
        }

        private static void EnsureFolders()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Materials")) AssetDatabase.CreateFolder("Assets", "Materials");
            if (!AssetDatabase.IsValidFolder("Assets/Art")) AssetDatabase.CreateFolder("Assets", "Art");
            if (!AssetDatabase.IsValidFolder("Assets/Art/Textures")) AssetDatabase.CreateFolder("Assets/Art", "Textures");
        }

        private static void DestroyIfFound(string name)
        {
            var obj = GameObject.Find(name);
            if (obj != null) Object.DestroyImmediate(obj);
        }
    }
}
