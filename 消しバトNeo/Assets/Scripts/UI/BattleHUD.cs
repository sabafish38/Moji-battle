using UnityEngine;
using Cyberasur.Core;

namespace Cyberasur.UI
{
    public class BattleHUD : MonoBehaviour
    {
        private EraserStats playerStats;
        private EraserStats enemyStats;
        private TurnPlayerController playerCtrl;
        private TurnBattleManager turnMgr;

        private Texture2D whiteTex;
        private GUIStyle headerStyle;
        private GUIStyle alertStyle;
        private GUIStyle calloutStyle;
        private GUIStyle labelStyle;
        private GUIStyle turnBannerStyle;
        private GUIStyle buttonStyle;
        private GUIStyle activeBtnStyle;

        private string battleMessage = "";
        private float messageTimer = 0f;

        private string combatCallout = "";
        private float calloutTimer = 0f;

        private bool showGaragePanel = false;

        private void Start()
        {
            FindEntities();
            CreateTextures();
        }

        private void FindEntities()
        {
            turnMgr = TurnBattleManager.Instance;

            var pObj = GameObject.Find("Player_Eraser");
            if (pObj != null)
            {
                playerStats = pObj.GetComponent<EraserStats>();
                playerCtrl = pObj.GetComponent<TurnPlayerController>();
            }

            var eObj = GameObject.Find("Enemy_Eraser");
            if (eObj != null)
            {
                enemyStats = eObj.GetComponent<EraserStats>();
            }
        }

        private void CreateTextures()
        {
            whiteTex = new Texture2D(1, 1);
            whiteTex.SetPixel(0, 0, Color.white);
            whiteTex.Apply();
        }

        private void Update()
        {
            if (messageTimer > 0f)
            {
                messageTimer -= Time.unscaledDeltaTime;
                if (messageTimer <= 0f) battleMessage = "";
            }
            if (calloutTimer > 0f)
            {
                calloutTimer -= Time.unscaledDeltaTime;
                if (calloutTimer <= 0f) combatCallout = "";
            }
        }

        public void ShowMessage(string msg, float duration = 1.6f)
        {
            battleMessage = msg;
            messageTimer = duration;
        }

        public void ShowCombatCallout(string callout, float duration = 1.2f)
        {
            combatCallout = callout;
            calloutTimer = duration;
        }

        private void OnGUI()
        {
            if (whiteTex == null) CreateTextures();
            InitStyles();

            if (turnMgr == null || playerStats == null)
            {
                FindEntities();
            }

            // 1. 機体頭上のスタイリッシュな3Dネーム＆HPバー
            DrawOverheadTag(playerStats, new Color(0.1f, 0.95f, 1f), true);
            DrawOverheadTag(enemyStats, new Color(1f, 0.25f, 0.45f), false);

            // 2. 上部ターン状況＆スコアボード
            DrawTurnStatusHeader();

            // 3. 自機ステータス＆スピン切替 (画面左下)
            DrawPlayerHUD();

            // 4. 敵機ステータス (画面右上)
            DrawEnemyHUD();

            // 5. 魔改造ガレージ切替ボタン (画面右下)
            DrawGarageControls();

            // 6. 滑走中アクションバー (画面下部中央)
            DrawMidShotActionHUD();

            // 7. 画面中央の戦況コールアウト
            DrawCenterBanners();

            // 8. 最小限のスマート操作チップス (画面左上)
            DrawMiniControlsGuide();
        }

        private void InitStyles()
        {
            if (headerStyle != null) return;

            headerStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.15f, 0.95f, 1f) }
            };

            alertStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 24,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = new Color(1f, 0.9f, 0.2f) }
            };

            calloutStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 20,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = new Color(0.2f, 1f, 0.95f) }
            };

            turnBannerStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 18,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = Color.cyan }
            };

            labelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 11,
                normal = { textColor = new Color(0.92f, 0.95f, 1f) }
            };

            buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                normal = { textColor = Color.white }
            };

            activeBtnStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.1f, 1f, 0.65f) }
            };
        }

        private void DrawOverheadTag(EraserStats stats, Color accentColor, bool isPlayer)
        {
            if (stats == null || Camera.main == null) return;

            Vector3 worldPos = stats.transform.position + Vector3.up * 1.05f;
            Vector3 screenPos = Camera.main.WorldToScreenPoint(worldPos);
            if (screenPos.z <= 0f) return;

            float guiX = screenPos.x;
            float guiY = Screen.height - screenPos.y;

            float w = 110f;
            float h = 24f;
            Rect box = new Rect(guiX - w * 0.5f, guiY - h, w, h);

            DrawRect(box, new Color(0.04f, 0.06f, 0.1f, 0.85f));
            DrawOutline(box, accentColor);

            float apPct = Mathf.Clamp01(stats.currentAP / stats.MaxAP);
            DrawRect(new Rect(box.x + 2, box.y + 14, (w - 4) * apPct, 6), accentColor);

            GUIStyle tagStyle = new GUIStyle(labelStyle)
            {
                fontSize = 10,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.UpperCenter,
                normal = { textColor = Color.white }
            };
            string label = isPlayer ? "PLAYER" : "CPU";
            GUI.Label(new Rect(box.x, box.y + 1, w, 13), label, tagStyle);

            // スリングショット引っ張り時に頭上にパワーゲージを表示
            if (isPlayer && playerCtrl != null && playerCtrl.isAiming && playerCtrl.currentPullRatio > 0.04f)
            {
                int pct = Mathf.RoundToInt(playerCtrl.currentPullRatio * 100f);
                Rect pwrBox = new Rect(guiX - 55f, guiY - h - 24f, 110f, 20f);
                DrawRect(pwrBox, new Color(0.02f, 0.04f, 0.08f, 0.95f));
                Color pwrCol = Color.Lerp(Color.cyan, new Color(1f, 0.2f, 0.5f), playerCtrl.currentPullRatio);
                DrawOutline(pwrBox, pwrCol);

                GUIStyle pwrStyle = new GUIStyle(tagStyle) { fontSize = 11, normal = { textColor = pwrCol } };
                GUI.Label(pwrBox, $"⚡ POWER: {pct}%", pwrStyle);
            }
        }

        private void DrawTurnStatusHeader()
        {
            float w = 380f;
            float h = 42f;
            float x = (Screen.width - w) * 0.5f;
            float y = 10f;

            DrawRect(new Rect(x, y, w, h), new Color(0.05f, 0.08f, 0.14f, 0.95f));
            DrawOutline(new Rect(x, y, w, h), new Color(0f, 0.8f, 1f, 0.7f));

            string turnText = "YOUR TURN";
            Color turnCol = new Color(0.2f, 1f, 0.65f);

            if (turnMgr != null)
            {
                switch (turnMgr.currentState)
                {
                    case BattleTurnState.PlayerTurn:
                        turnText = $"▶ TURN {turnMgr.turnCount}: あなたの手番 (手前に引いて発射)";
                        turnCol = new Color(0.2f, 1f, 0.65f);
                        break;
                    case BattleTurnState.Simulating:
                        turnText = "⚡ CLASH SIMULATION ⚡";
                        turnCol = new Color(1f, 0.85f, 0.2f);
                        break;
                    case BattleTurnState.EnemyTurn:
                        turnText = "◀ CPUの手番 (思考中...)";
                        turnCol = new Color(1f, 0.35f, 0.55f);
                        break;
                    case BattleTurnState.RoundEnd:
                        turnText = "★ ROUND FINISHED ★";
                        turnCol = Color.white;
                        break;
                }
            }

            turnBannerStyle.normal.textColor = turnCol;
            GUI.Label(new Rect(x, y + 2, w, 22), turnText, turnBannerStyle);

            int pScore = turnMgr != null ? turnMgr.playerWins : 0;
            int eScore = turnMgr != null ? turnMgr.enemyWins : 0;
            string scoreStr = $"PLAYER {pScore}  -  {eScore} CPU";
            GUIStyle scoreStyle = new GUIStyle(labelStyle) { alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold };
            GUI.Label(new Rect(x, y + 22, w, 16), scoreStr, scoreStyle);
        }

        private void DrawPlayerHUD()
        {
            if (playerStats == null) return;

            float x = 16f;
            float y = Screen.height - 115f;
            float w = 250f;

            DrawRect(new Rect(x - 6, y - 6, w + 12, 108), new Color(0.04f, 0.07f, 0.12f, 0.92f));
            DrawOutline(new Rect(x - 6, y - 6, w + 12, 108), new Color(0f, 0.7f, 1f, 0.5f));

            GUI.Label(new Rect(x, y - 4, w, 18), playerStats.machineTitle, headerStyle);

            float apPct = Mathf.Clamp01(playerStats.currentAP / playerStats.MaxAP);
            DrawBar(new Rect(x, y + 16, w, 14), apPct, new Color(0.1f, 0.88f, 0.45f), $"AP: {(int)playerStats.currentAP} / {(int)playerStats.MaxAP}");

            float stgPct = Mathf.Clamp01(playerStats.currentStagger / playerStats.MaxStagger);
            DrawBar(new Rect(x, y + 33, w, 12), stgPct, new Color(1f, 0.7f, 0.15f), $"STAGGER (体幹): {(int)playerStats.currentStagger}%");

            GUI.Label(new Rect(x, y + 48, w, 16), "【打点スピン (1/2/3キー)】", labelStyle);

            float btnW = (w - 6f) / 3f;
            if (GUI.Button(new Rect(x, y + 66, btnW, 24), "突進Top", playerStats.selectedSpin == SpinType.TopSpin ? activeBtnStyle : buttonStyle))
            {
                playerStats.selectedSpin = SpinType.TopSpin;
            }
            if (GUI.Button(new Rect(x + btnW + 3f, y + 66, btnW, 24), "標準Flat", playerStats.selectedSpin == SpinType.NoSpin ? activeBtnStyle : buttonStyle))
            {
                playerStats.selectedSpin = SpinType.NoSpin;
            }
            if (GUI.Button(new Rect(x + (btnW + 3f) * 2f, y + 66, btnW, 24), "停止Back", playerStats.selectedSpin == SpinType.BackSpin ? activeBtnStyle : buttonStyle))
            {
                playerStats.selectedSpin = SpinType.BackSpin;
            }
        }

        private void DrawEnemyHUD()
        {
            if (enemyStats == null) return;

            float w = 220f;
            float x = Screen.width - w - 16f;
            float y = 14f;

            DrawRect(new Rect(x - 6, y - 6, w + 12, 68), new Color(0.12f, 0.04f, 0.08f, 0.92f));
            DrawOutline(new Rect(x - 6, y - 6, w + 12, 68), new Color(1f, 0.25f, 0.45f, 0.5f));

            GUIStyle enemyHeader = new GUIStyle(headerStyle) { normal = { textColor = new Color(1f, 0.35f, 0.55f) } };
            GUI.Label(new Rect(x, y - 4, w, 18), "RED-HAZARD // CPU", enemyHeader);

            float apPct = Mathf.Clamp01(enemyStats.currentAP / enemyStats.MaxAP);
            DrawBar(new Rect(x, y + 16, w, 14), apPct, new Color(1f, 0.22f, 0.38f), $"AP: {(int)enemyStats.currentAP}");

            float stgPct = Mathf.Clamp01(enemyStats.currentStagger / enemyStats.MaxStagger);
            DrawBar(new Rect(x, y + 33, w, 12), stgPct, new Color(1f, 0.6f, 0.1f), $"STAGGER: {(int)enemyStats.currentStagger}%");
        }

        private void DrawGarageControls()
        {
            float btnW = 160f;
            float x = Screen.width - btnW - 16f;
            float y = Screen.height - 44f;

            if (GUI.Button(new Rect(x, y, btnW, 30), showGaragePanel ? "✖ 閉じる" : "🔧 ガレージ (機体変更)", buttonStyle))
            {
                showGaragePanel = !showGaragePanel;
            }

            if (!showGaragePanel || playerStats == null) return;

            float pw = 300f;
            float ph = 180f;
            float px = Screen.width - pw - 16f;
            float py = Screen.height - ph - 52f;

            DrawRect(new Rect(px, py, pw, ph), new Color(0.04f, 0.07f, 0.13f, 0.96f));
            DrawOutline(new Rect(px, py, pw, ph), Color.cyan);

            GUI.Label(new Rect(px + 10, py + 8, pw - 20, 20), "⚡ CHASSIS LOADOUT ⚡", headerStyle);

            if (GUI.Button(new Rect(px + 10, py + 34, pw - 20, 34), "① MONO-EX01 [標準バランス]", playerStats.chassisType == ChassisType.Balanced_Mono ? activeBtnStyle : buttonStyle))
            {
                playerStats.ApplyChassisStats(ChassisType.Balanced_Mono);
                ShowCombatCallout("EQUIPPED: MONO-EX01");
            }

            if (GUI.Button(new Rect(px + 10, py + 74, pw - 20, 34), "② JUMBO-TITAN [超重量・高耐久]", playerStats.chassisType == ChassisType.Heavy_Titan ? activeBtnStyle : buttonStyle))
            {
                playerStats.ApplyChassisStats(ChassisType.Heavy_Titan);
                ShowCombatCallout("EQUIPPED: JUMBO-TITAN");
            }

            if (GUI.Button(new Rect(px + 10, py + 114, pw - 20, 34), "③ KNOCK-PHANTOM [超高速・反発型]", playerStats.chassisType == ChassisType.Speed_Phantom ? activeBtnStyle : buttonStyle))
            {
                playerStats.ApplyChassisStats(ChassisType.Speed_Phantom);
                ShowCombatCallout("EQUIPPED: KNOCK-PHANTOM");
            }
        }

        private void DrawMidShotActionHUD()
        {
            if (turnMgr == null || turnMgr.currentState != BattleTurnState.Simulating) return;
            if (playerCtrl == null || !playerCtrl.wasJustFired || playerCtrl.usedMidShotSkill) return;

            float w = 360f;
            float h = 36f;
            float x = (Screen.width - w) * 0.5f;
            float y = Screen.height - 52f;

            DrawRect(new Rect(x - 4, y - 4, w + 8, h + 8), new Color(0.05f, 0.1f, 0.18f, 0.9f));
            DrawOutline(new Rect(x - 4, y - 4, w + 8, h + 8), new Color(1f, 0.85f, 0.2f));

            if (GUI.Button(new Rect(x, y, w * 0.48f, h), "🚀 [Space] 2段ブースト!", activeBtnStyle))
            {
                playerCtrl.TriggerAfterburnerSkill();
            }
            if (GUI.Button(new Rect(x + w * 0.52f, y, w * 0.48f, h), "⚓ [右クリック] アンカー急停止!", buttonStyle))
            {
                playerCtrl.TriggerAnchorBrakeSkill();
            }
        }

        private void DrawCenterBanners()
        {
            if (!string.IsNullOrEmpty(combatCallout))
            {
                Rect cr = new Rect(Screen.width * 0.25f, Screen.height * 0.22f, Screen.width * 0.5f, 32f);
                DrawRect(cr, new Color(0.02f, 0.05f, 0.1f, 0.85f));
                DrawOutline(cr, new Color(0.1f, 0.9f, 1f, 0.8f));
                GUI.Label(cr, combatCallout, calloutStyle);
            }

            if (!string.IsNullOrEmpty(battleMessage))
            {
                Rect br = new Rect(0, Screen.height * 0.44f, Screen.width, 46f);
                DrawRect(br, new Color(0.04f, 0.06f, 0.12f, 0.92f));
                DrawOutline(br, new Color(1f, 0.85f, 0.2f, 0.8f));
                GUI.Label(br, battleMessage, alertStyle);
            }
        }

        private void DrawMiniControlsGuide()
        {
            float x = 14f;
            float y = 14f;
            float w = 180f;
            float h = 52f;

            DrawRect(new Rect(x, y, w, h), new Color(0.03f, 0.05f, 0.09f, 0.75f));
            DrawOutline(new Rect(x, y, w, h), new Color(0.2f, 0.7f, 1f, 0.4f));

            GUI.Label(new Rect(x + 8, y + 4, w - 16, 16), "🎯 操作方法", headerStyle);
            GUI.Label(new Rect(x + 8, y + 20, w - 16, 14), "• マウスを引いて離す: シュート", labelStyle);
            GUI.Label(new Rect(x + 8, y + 34, w - 16, 14), "• 滑走中にSpace: 追撃ブースト", labelStyle);
        }

        private void DrawBar(Rect rect, float fillPct, Color fillColor, string text)
        {
            DrawRect(rect, new Color(0.12f, 0.14f, 0.18f, 0.95f));
            DrawRect(new Rect(rect.x, rect.y, rect.width * fillPct, rect.height), fillColor);
            DrawOutline(rect, new Color(0.45f, 0.5f, 0.6f, 0.5f));

            GUIStyle barTextStyle = new GUIStyle(labelStyle) { fontSize = 10, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter };
            GUI.Label(rect, text, barTextStyle);
        }

        private void DrawRect(Rect rect, Color color)
        {
            Color prev = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, whiteTex);
            GUI.color = prev;
        }

        private void DrawOutline(Rect rect, Color color)
        {
            DrawRect(new Rect(rect.x, rect.y, rect.width, 1), color);
            DrawRect(new Rect(rect.x, rect.yMax - 1, rect.width, 1), color);
            DrawRect(new Rect(rect.x, rect.y, 1, rect.height), color);
            DrawRect(new Rect(rect.xMax - 1, rect.y, 1, rect.height), color);
        }
    }
}
