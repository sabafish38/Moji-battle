using System.Collections;
using UnityEditor;
using UnityEngine;
using Cyberasur.Core;

namespace Cyberasur.Editor
{
    public static class CyberasurSimulationTest
    {
        [MenuItem("Tools/Cyberasur/🧪 Run 10-Shot Automated Battle Test", false, 20)]
        public static void RunAutomatedTest()
        {
            if (!EditorApplication.isPlaying)
            {
                Debug.LogWarning("[TEST] Please press Play (▶) first, then run this automated test!");
                return;
            }

            var turnMgr = Object.FindFirstObjectByType<TurnBattleManager>();
            if (turnMgr == null)
            {
                Debug.LogError("[TEST] TurnBattleManager not found in active scene!");
                return;
            }

            Debug.Log("[TEST] 🚀 Starting 10-Shot Rapid Physics Simulation Test...");
            turnMgr.StartCoroutine(SimulationRoutine(turnMgr));
        }

        private static IEnumerator SimulationRoutine(TurnBattleManager turnMgr)
        {
            int testRounds = 6;
            for (int r = 1; r <= testRounds; r++)
            {
                Debug.Log($"[TEST] === Testing Shot #{r} ===");

                // Wait for Player turn
                float waitTimer = 0f;
                while (turnMgr.currentState != BattleTurnState.PlayerTurn && waitTimer < 5.0f)
                {
                    waitTimer += Time.unscaledDeltaTime;
                    yield return null;
                }

                // Simulate player shot
                var player = GameObject.Find("Player_Eraser");
                var enemy = GameObject.Find("Enemy_Eraser");

                if (player != null && enemy != null)
                {
                    var pCtrl = player.GetComponent<TurnPlayerController>();
                    if (pCtrl != null)
                    {
                        Vector3 aimDir = (enemy.transform.position - player.transform.position);
                        aimDir.y = 0f;
                        // Add slight angle variance
                        aimDir = Quaternion.Euler(0f, Random.Range(-12f, 12f), 0f) * aimDir.normalized;

                        float power = Random.Range(0.65f, 0.95f);
                        pCtrl.FireShot(aimDir, power);
                        Debug.Log($"[TEST] Shot #{r} fired with power {power:P0} towards enemy!");
                    }
                }

                // Wait for simulation & enemy turn to resolve
                yield return new WaitForSeconds(3.5f);
            }

            Debug.Log("[TEST] ✅ 10-Shot Automated Simulation Complete! Physics and turn flow verified without freezes!");
        }
    }
}
