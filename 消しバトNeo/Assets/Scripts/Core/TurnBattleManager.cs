using System;
using System.Collections;
using UnityEngine;
using Cyberasur.AI;
using Cyberasur.FX;
using Cyberasur.UI;

namespace Cyberasur.Core
{
    public enum BattleTurnState
    {
        PlayerTurn,
        Simulating,
        EnemyTurn,
        RoundEnd
    }

    public class TurnBattleManager : MonoBehaviour
    {
        public static TurnBattleManager Instance { get; private set; }

        [Header("Turn State")]
        public BattleTurnState currentState = BattleTurnState.PlayerTurn;
        public int turnCount = 1;
        [SerializeField] private float minVelocityToStop = 0.25f; // スムーズな停止閾値
        [SerializeField] private float maxSimulationDuration = 3.8f; // テンポ向上のため短縮

        [Header("Match Scores")]
        public int playerWins = 0;
        public int enemyWins = 0;

        public event Action<BattleTurnState> OnTurnChanged;

        private Rigidbody playerRb;
        private Rigidbody enemyRb;
        private EraserStats playerStats;
        private EraserStats enemyStats;
        private BattleHUD hud;
        private bool isResolvingRound = false;
        private bool lastTurnWasPlayer = true;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        private void Start()
        {
            hud = FindAnyObjectByType<BattleHUD>();
            FindParticipants();
            StartPlayerTurn();
        }

        private void Update()
        {
            if (!isResolvingRound)
            {
                CheckWinConditions();
            }
        }

        private void FindParticipants()
        {
            var p = GameObject.Find("Player_Eraser");
            if (p != null)
            {
                playerRb = p.GetComponent<Rigidbody>();
                playerStats = p.GetComponent<EraserStats>();
            }

            var e = GameObject.Find("Enemy_Eraser");
            if (e != null)
            {
                enemyRb = e.GetComponent<Rigidbody>();
                enemyStats = e.GetComponent<EraserStats>();
            }
        }

        public void StartPlayerTurn()
        {
            if (isResolvingRound) return;
            FindParticipants();

            currentState = BattleTurnState.PlayerTurn;
            lastTurnWasPlayer = true;
            OnTurnChanged?.Invoke(currentState);

            var pCtrl = playerRb != null ? playerRb.GetComponent<TurnPlayerController>() : null;
            if (pCtrl != null)
            {
                pCtrl.StopTrail();
                pCtrl.usedMidShotSkill = false;
            }

            if (hud != null)
            {
                hud.ShowMessage($"★ TURN {turnCount} : YOUR SHOT! ★", 1.4f);
            }
        }

        public void OnEntityLaunched()
        {
            currentState = BattleTurnState.Simulating;
            OnTurnChanged?.Invoke(currentState);
            StopAllCoroutines();
            StartCoroutine(WaitUntilObjectsStopRoutine());
        }

        private IEnumerator WaitUntilObjectsStopRoutine()
        {
            yield return new WaitForSeconds(0.28f);

            float simTimer = 0f;
            float stopThresholdSq = minVelocityToStop * minVelocityToStop;

            while (simTimer < maxSimulationDuration)
            {
                simTimer += Time.deltaTime;

                if (CheckWinConditions())
                {
                    yield break;
                }

                // 低速になったらスムーズにブレーキをかけてピタッと止める (テンポの大幅向上)
                if (playerRb != null && playerRb.linearVelocity.sqrMagnitude < 0.6f)
                {
                    playerRb.linearVelocity *= 0.85f;
                }
                if (enemyRb != null && enemyRb.linearVelocity.sqrMagnitude < 0.6f)
                {
                    enemyRb.linearVelocity *= 0.85f;
                }

                bool playerStopped = (playerRb == null) || (playerRb.linearVelocity.sqrMagnitude < stopThresholdSq);
                bool enemyStopped = (enemyRb == null) || (enemyRb.linearVelocity.sqrMagnitude < stopThresholdSq);

                if (playerStopped && enemyStopped)
                {
                    break;
                }

                yield return null;
            }

            if (playerRb != null)
            {
                playerRb.linearVelocity = Vector3.zero;
                playerRb.angularVelocity = Vector3.zero;
                var pCtrl = playerRb.GetComponent<TurnPlayerController>();
                if (pCtrl != null) pCtrl.StopTrail();
            }

            if (enemyRb != null)
            {
                enemyRb.linearVelocity = Vector3.zero;
                enemyRb.angularVelocity = Vector3.zero;
            }

            if (!isResolvingRound)
            {
                // 待ち時間わずか0.15秒で即座に次のターンへ移行！テンポ爆速
                yield return new WaitForSeconds(0.15f);
                if (lastTurnWasPlayer)
                {
                    StartEnemyTurn();
                }
                else
                {
                    turnCount++;
                    StartPlayerTurn();
                }
            }
        }

        public void StartEnemyTurn()
        {
            if (isResolvingRound) return;
            FindParticipants();

            currentState = BattleTurnState.EnemyTurn;
            lastTurnWasPlayer = false;
            OnTurnChanged?.Invoke(currentState);

            if (hud != null)
            {
                hud.ShowMessage("CPU TURN : AIMING...", 1.0f);
            }

            var ai = enemyRb != null ? enemyRb.GetComponent<TurnEnemyAI>() : null;
            if (ai != null)
            {
                ai.ExecuteAITurn();
            }
            else
            {
                StartPlayerTurn();
            }
        }

        private bool CheckWinConditions()
        {
            if (isResolvingRound) return true;

            // 1. 机の外へ落下判定 (机のフチは X: ±8.0, Z: ±5.5)
            // 落下した瞬間に即座に検知してスローモーション演出！
            bool playerFell = playerRb != null && (Mathf.Abs(playerRb.transform.position.x) > 8.2f || Mathf.Abs(playerRb.transform.position.z) > 5.8f || playerRb.transform.position.y < -0.8f);
            bool enemyFell = enemyRb != null && (Mathf.Abs(enemyRb.transform.position.x) > 8.2f || Mathf.Abs(enemyRb.transform.position.z) > 5.8f || enemyRb.transform.position.y < -0.8f);

            if (enemyFell)
            {
                ResolveRound(true, "RING OUT!! ENEMY FELL OFF DESK!");
                return true;
            }
            if (playerFell)
            {
                ResolveRound(false, "RING OUT!! YOU FELL OFF DESK!");
                return true;
            }

            // 2. AP K.O. check
            if (enemyStats != null && enemyStats.currentAP <= 0f)
            {
                ResolveRound(true, "K.O.!! ENEMY CORE DESTROYED!");
                return true;
            }
            if (playerStats != null && playerStats.currentAP <= 0f)
            {
                ResolveRound(false, "K.O.!! PLAYER CORE DESTROYED!");
                return true;
            }

            return false;
        }

        public void ResolveRound(bool playerWon, string reason)
        {
            if (isResolvingRound) return;
            isResolvingRound = true;
            currentState = BattleTurnState.RoundEnd;
            OnTurnChanged?.Invoke(currentState);

            StopAllCoroutines();

            // 劇的なフィニッシュスローモーション！
            Time.timeScale = 0.2f;

            if (playerWon)
            {
                playerWins++;
                if (CyberAudioSynthesizer.Instance != null) CyberAudioSynthesizer.Instance.PlayVictory();
            }
            else
            {
                enemyWins++;
                if (CyberAudioSynthesizer.Instance != null) CyberAudioSynthesizer.Instance.PlayRingOut();
            }

            string banner = playerWon ? $"★ VICTORY! {reason} ★" : $"✖ DEFEAT! {reason} ✖";
            if (hud != null)
            {
                hud.ShowMessage(banner, 2.5f);
            }

            StartCoroutine(NextRoundRoutine());
        }

        private IEnumerator NextRoundRoutine()
        {
            yield return new WaitForSecondsRealtime(2.0f);
            Time.timeScale = 1.0f;

            if (DeskArenaManager.Instance != null)
            {
                DeskArenaManager.Instance.ResetArenaEntities();
            }

            turnCount = 1;
            isResolvingRound = false;
            StartPlayerTurn();
        }
    }
}
