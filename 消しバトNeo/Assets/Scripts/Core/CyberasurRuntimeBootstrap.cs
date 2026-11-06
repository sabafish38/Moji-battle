using UnityEngine;
using Cyberasur.AI;
using Cyberasur.FX;
using Cyberasur.UI;

namespace Cyberasur.Core
{
    public class CyberasurRuntimeBootstrap : MonoBehaviour
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void EnsureGameReadyOnPlay()
        {
            // 1. Remove any stray default Cube at origin
            var strayCube = GameObject.Find("Cube");
            if (strayCube != null) Destroy(strayCube);

            // 2. Ensure FX Manager & Audio Synthesizer exist
            var fxMgr = GameObject.Find("FX_Manager");
            if (fxMgr == null) fxMgr = new GameObject("FX_Manager");
            if (fxMgr.GetComponent<CameraShaker>() == null) fxMgr.AddComponent<CameraShaker>();
            if (fxMgr.GetComponent<HitStopManager>() == null) fxMgr.AddComponent<HitStopManager>();
            if (fxMgr.GetComponent<ImpactEffectSpawner>() == null) fxMgr.AddComponent<ImpactEffectSpawner>();
            if (fxMgr.GetComponent<CyberAudioSynthesizer>() == null) fxMgr.AddComponent<CyberAudioSynthesizer>();

            // 3. Ensure BattleHUD exists
            var hudObj = GameObject.Find("BattleHUD");
            if (hudObj == null) hudObj = new GameObject("BattleHUD");
            if (hudObj.GetComponent<BattleHUD>() == null) hudObj.AddComponent<BattleHUD>();

            // 4. Ensure TurnBattleManager & DeskArenaManager exist
            var turnMgrObj = GameObject.Find("TurnBattleManager");
            if (turnMgrObj == null) turnMgrObj = new GameObject("TurnBattleManager");
            if (turnMgrObj.GetComponent<TurnBattleManager>() == null) turnMgrObj.AddComponent<TurnBattleManager>();
            if (turnMgrObj.GetComponent<DeskArenaManager>() == null) turnMgrObj.AddComponent<DeskArenaManager>();

            // 5. Create low-friction slick PhysicsMaterial for authentic desktop gliding
            PhysicsMaterial slickMat = new PhysicsMaterial("CyberDeskSlick")
            {
                dynamicFriction = 0.06f,
                staticFriction = 0.06f,
                bounciness = 0.4f,
                frictionCombine = PhysicsMaterialCombine.Minimum,
                bounceCombine = PhysicsMaterialCombine.Maximum
            };

            foreach (var col in FindObjectsByType<Collider>())
            {
                col.sharedMaterial = slickMat;
            }

            // 6. Upgrade Player_Eraser if it still has old components
            var player = GameObject.Find("Player_Eraser");
            if (player != null)
            {
                var oldCtrl = player.GetComponent<PlayerEraserController>();
                if (oldCtrl != null) Destroy(oldCtrl);

                if (player.GetComponent<EraserStats>() == null) player.AddComponent<EraserStats>();
                if (player.GetComponent<BumperPhysics>() == null) player.AddComponent<BumperPhysics>();
                if (player.GetComponent<EraserPartSlot>() == null) player.AddComponent<EraserPartSlot>();
                if (player.GetComponent<TurnPlayerController>() == null) player.AddComponent<TurnPlayerController>();

                var rb = player.GetComponent<Rigidbody>();
                if (rb != null)
                {
                    rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
                }
            }

            // 7. Upgrade Enemy_Eraser if it still has old components
            var enemy = GameObject.Find("Enemy_Eraser");
            if (enemy != null)
            {
                var oldAi = enemy.GetComponent<EnemyAIController>();
                if (oldAi != null) Destroy(oldAi);

                if (enemy.GetComponent<EraserStats>() == null) enemy.AddComponent<EraserStats>();
                if (enemy.GetComponent<BumperPhysics>() == null) enemy.AddComponent<BumperPhysics>();
                if (enemy.GetComponent<EraserPartSlot>() == null) enemy.AddComponent<EraserPartSlot>();
                if (enemy.GetComponent<TurnEnemyAI>() == null) enemy.AddComponent<TurnEnemyAI>();

                var rb = enemy.GetComponent<Rigidbody>();
                if (rb != null)
                {
                    rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ;
                }
            }

            // 8. Ensure Main Camera has fixed stage overhead view with dark cyber backdrop
            if (Camera.main != null)
            {
                Camera.main.clearFlags = CameraClearFlags.SolidColor;
                Camera.main.backgroundColor = new Color(0.03f, 0.04f, 0.08f, 1f);
                var follow = Camera.main.GetComponent<SmoothFollowCamera>();
                if (follow == null)
                {
                    follow = Camera.main.gameObject.AddComponent<SmoothFollowCamera>();
                }
                follow.ApplyFixedOverheadView();
            }
        }
    }
}
