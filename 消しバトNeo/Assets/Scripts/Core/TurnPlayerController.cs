using UnityEngine;
using Cyberasur.FX;
using Cyberasur.UI;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Cyberasur.Core
{
    [RequireComponent(typeof(Rigidbody))]
    public class TurnPlayerController : MonoBehaviour
    {
        [Header("Slingshot Settings")]
        [SerializeField] private float maxDragScreenPixels = 240f; // 画面上での最大ドラッグ距離 (解像度依存を自動補正)
        [SerializeField] private float minLaunchForce = 8f;
        [SerializeField] private float maxLaunchForce = 25f;

        [Header("Visuals")]
        [SerializeField] private Color trajectoryColor = new Color(0f, 0.95f, 1f, 0.95f);
        [SerializeField] private Color slingshotBandColor = new Color(1f, 0.85f, 0.1f, 0.95f);

        public bool wasJustFired = false;
        public bool usedMidShotSkill = false;
        public float currentPullRatio = 0f;
        public bool isAiming = false;

        private Rigidbody rb;
        private EraserStats stats;
        private Camera mainCamera;
        private LineRenderer trajectoryLine;
        private LineRenderer slingshotBandLine;
        private TrailRenderer boostTrail;

        private Vector2 dragStartScreenPos;
        private Vector3 currentAimDirection = Vector3.right;
        private Vector3 currentPullWorldPoint;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            stats = GetComponent<EraserStats>();

            // 消しゴムが斜めに立ったりひっくり返るのを完全に防止 (消しバトの水平滑走を保証)
            rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ | RigidbodyConstraints.FreezePositionY;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;

            SetupTrajectoryLine();
            SetupSlingshotBandLine();
            SetupBoostTrail();
        }

        private void Start()
        {
            mainCamera = Camera.main;
            currentAimDirection = Vector3.right; // 敵の方向 (+X)
        }

        private void SetupTrajectoryLine()
        {
            trajectoryLine = GetComponent<LineRenderer>();
            if (trajectoryLine == null) trajectoryLine = gameObject.AddComponent<LineRenderer>();
            trajectoryLine.positionCount = 3;
            trajectoryLine.startWidth = 0.22f;
            trajectoryLine.endWidth = 0.04f;
            trajectoryLine.useWorldSpace = true;
            trajectoryLine.enabled = false;

            var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (shader == null) shader = Shader.Find("Sprites/Default");
            if (shader != null)
            {
                var mat = new Material(shader);
                mat.SetColor("_BaseColor", trajectoryColor);
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", trajectoryColor * 3.0f);
                trajectoryLine.material = mat;
            }
        }

        private void SetupSlingshotBandLine()
        {
            GameObject bandObj = new GameObject("Slingshot_Band_Visual");
            bandObj.transform.SetParent(transform);
            slingshotBandLine = bandObj.AddComponent<LineRenderer>();
            slingshotBandLine.positionCount = 2;
            slingshotBandLine.startWidth = 0.14f;
            slingshotBandLine.endWidth = 0.06f;
            slingshotBandLine.useWorldSpace = true;
            slingshotBandLine.enabled = false;

            var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (shader == null) shader = Shader.Find("Sprites/Default");
            if (shader != null)
            {
                var mat = new Material(shader);
                mat.SetColor("_BaseColor", slingshotBandColor);
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", slingshotBandColor * 3.5f);
                slingshotBandLine.material = mat;
            }
        }

        private void SetupBoostTrail()
        {
            boostTrail = GetComponent<TrailRenderer>();
            if (boostTrail == null) boostTrail = gameObject.AddComponent<TrailRenderer>();
            boostTrail.time = 0.35f;
            boostTrail.startWidth = 0.85f;
            boostTrail.endWidth = 0.05f;
            boostTrail.emitting = false;

            var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (shader == null) shader = Shader.Find("Sprites/Default");
            if (shader != null)
            {
                var mat = new Material(shader);
                mat.SetColor("_BaseColor", new Color(0.1f, 0.85f, 1f, 0.85f));
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", new Color(0.1f, 0.85f, 1f) * 2.5f);
                boostTrail.material = mat;
            }
        }

        private void Update()
        {
            if (mainCamera == null) mainCamera = Camera.main;
            if (TurnBattleManager.Instance == null) return;

            var state = TurnBattleManager.Instance.currentState;

            // 滑走中の2段ブースト・ブレーキ入力
            if (state == BattleTurnState.Simulating && wasJustFired && !usedMidShotSkill)
            {
                HandleMidShotSkillInput();
                return;
            }

            if (state != BattleTurnState.PlayerTurn)
            {
                if (isAiming) CancelAim();
                return;
            }

            HandleSpinSwitchInput();
            HandleScreenSpaceSlingshot();
        }

        private void GetPointerState(out Vector2 screenPos, out bool down, out bool held, out bool up, out bool rightDown)
        {
            screenPos = Vector2.zero;
            down = false;
            held = false;
            up = false;
            rightDown = false;

#if ENABLE_INPUT_SYSTEM
            if (Mouse.current != null)
            {
                screenPos = Mouse.current.position.ReadValue();
                down = Mouse.current.leftButton.wasPressedThisFrame;
                held = Mouse.current.leftButton.isPressed;
                up = Mouse.current.leftButton.wasReleasedThisFrame;
                rightDown = Mouse.current.rightButton.wasPressedThisFrame;
            }
#else
            screenPos = Input.mousePosition;
            down = Input.GetMouseButtonDown(0);
            held = Input.GetMouseButton(0);
            up = Input.GetMouseButtonUp(0);
            rightDown = Input.GetMouseButtonDown(1);
#endif
        }

        private void HandleSpinSwitchInput()
        {
            if (stats == null) return;
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current != null)
            {
                if (Keyboard.current.digit1Key.wasPressedThisFrame) stats.selectedSpin = SpinType.TopSpin;
                if (Keyboard.current.digit2Key.wasPressedThisFrame) stats.selectedSpin = SpinType.NoSpin;
                if (Keyboard.current.digit3Key.wasPressedThisFrame) stats.selectedSpin = SpinType.BackSpin;
            }
#endif
        }

        /// <summary>
        /// ★ カメラの向き・画角に完全一致した完璧なスクリーン空間スリングショット
        /// 画面上で「手前に引けば奥へ飛ぶ」「右下に引けば左奥へ飛ぶ」という、1ミリの違和感もない直感的入力！
        /// </summary>
        private void HandleScreenSpaceSlingshot()
        {
            GetPointerState(out Vector2 mousePos, out bool mouseDown, out bool mouseHeld, out bool mouseUp, out bool rightClick);

            // UIボタン領域のクリックを除外
            bool overBottomUI = (mousePos.x < 320f && mousePos.y < 160f) || (mousePos.x > Screen.width - 240f && mousePos.y < 70f);
            bool overTopUI = (mousePos.y > Screen.height - 75f);

            if (mouseDown && !overBottomUI && !overTopUI)
            {
                isAiming = true;
                dragStartScreenPos = mousePos;
                if (trajectoryLine != null) trajectoryLine.enabled = true;
                if (slingshotBandLine != null) slingshotBandLine.enabled = true;
            }

            if (isAiming && rightClick)
            {
                CancelAim();
                return;
            }

            if (isAiming && mouseHeld && mainCamera != null)
            {
                // 画面上のドラッグベクトル (ピクセル差分)
                // startScreen から mousePos へのベクトルが「引っ張った方向」
                // その逆方向 (mousePos -> startScreen) が「発射したい方向」
                Vector2 screenDrag = dragStartScreenPos - mousePos;
                float dragMagnitude = screenDrag.magnitude;

                float maxPixels = Mathf.Clamp(Screen.height * 0.32f, 160f, maxDragScreenPixels);
                currentPullRatio = Mathf.Clamp01(dragMagnitude / maxPixels);

                if (dragMagnitude > 8f)
                {
                    // カメラの水平方向ベクトルを取得
                    Vector3 camFwd = mainCamera.transform.forward;
                    camFwd.y = 0f;
                    camFwd.Normalize();

                    Vector3 camRight = mainCamera.transform.right;
                    camRight.y = 0f;
                    camRight.Normalize();

                    // 画面の上下(Y)はカメラの前後(camFwd)、画面の左右(X)はカメラの左右(camRight)に射影！
                    Vector2 screenDir = screenDrag.normalized;
                    Vector3 worldAimDir = (camRight * screenDir.x + camFwd * screenDir.y).normalized;
                    worldAimDir.y = 0f;

                    if (worldAimDir.sqrMagnitude > 0.01f)
                    {
                        currentAimDirection = worldAimDir;
                        transform.rotation = Quaternion.LookRotation(currentAimDirection, Vector3.up);
                    }
                }

                // スリングショットゴム紐の視覚表現 (自機の背後から引っ張り点へ)
                Vector3 origin = transform.position + Vector3.up * 0.1f;
                currentPullWorldPoint = origin - (currentAimDirection * (currentPullRatio * 2.2f));

                if (slingshotBandLine != null)
                {
                    slingshotBandLine.SetPosition(0, origin);
                    slingshotBandLine.SetPosition(1, currentPullWorldPoint);
                }

                UpdateTrajectoryPreview(currentAimDirection, currentPullRatio);
            }

            if (isAiming && mouseUp)
            {
                if (currentPullRatio > 0.10f)
                {
                    FireShot(currentAimDirection, currentPullRatio);
                }
                else
                {
                    CancelAim();
                }
            }
        }

        private void UpdateTrajectoryPreview(Vector3 dir, float powerRatio)
        {
            if (trajectoryLine == null) return;

            Vector3 origin = transform.position + Vector3.up * 0.1f;
            float maxRayDist = Mathf.Lerp(2.5f, 10.5f, powerRatio);

            trajectoryLine.SetPosition(0, origin);

            // 障害物・敵との衝突＆バンク反射予測
            if (Physics.SphereCast(origin, 0.45f, dir, out RaycastHit hit, maxRayDist))
            {
                Vector3 hitPos = origin + dir * hit.distance;
                trajectoryLine.SetPosition(1, hitPos);

                Vector3 normal = hit.normal;
                normal.y = 0f;
                Vector3 reflectDir = Vector3.Reflect(dir, normal.normalized);
                trajectoryLine.SetPosition(2, hitPos + reflectDir * 2.8f);
            }
            else
            {
                Vector3 endPos = origin + dir * maxRayDist;
                trajectoryLine.SetPosition(1, endPos);
                trajectoryLine.SetPosition(2, endPos);
            }

            // パワーに応じてシアン -> ゴールド -> マゼンタにエミッション変化
            Color c = powerRatio > 0.85f
                ? new Color(1f, 0.25f, 0.55f, 1f)
                : Color.Lerp(new Color(0f, 0.95f, 1f, 1f), new Color(1f, 0.85f, 0.15f, 1f), powerRatio);

            if (trajectoryLine.material != null)
            {
                trajectoryLine.material.SetColor("_BaseColor", c);
                trajectoryLine.material.SetColor("_EmissionColor", c * 3.5f);
            }
        }

        public void FireShot(Vector3 direction, float powerRatio)
        {
            isAiming = false;
            if (trajectoryLine != null) trajectoryLine.enabled = false;
            if (slingshotBandLine != null) slingshotBandLine.enabled = false;
            if (boostTrail != null) boostTrail.emitting = true;

            direction.y = 0f;
            if (direction.sqrMagnitude < 0.001f) direction = transform.forward;
            direction.Normalize();

            transform.rotation = Quaternion.LookRotation(direction, Vector3.up);

            float speedMult = stats != null ? stats.launchSpeedMultiplier : 1.0f;
            float force = Mathf.Lerp(minLaunchForce, maxLaunchForce, powerRatio) * speedMult;

            // 確実な初速付与
            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
            rb.AddForce(direction * force * rb.mass, ForceMode.Impulse);

            if (CyberAudioSynthesizer.Instance != null)
            {
                CyberAudioSynthesizer.Instance.PlayLaunch();
            }

            wasJustFired = true;
            usedMidShotSkill = false;
            currentPullRatio = 0f;

            TurnBattleManager.Instance.OnEntityLaunched();
        }

        private void HandleMidShotSkillInput()
        {
            bool boostPressed = false;
            bool brakePressed = false;

#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current != null)
            {
                if (Keyboard.current.spaceKey.wasPressedThisFrame) boostPressed = true;
                if (Keyboard.current.bKey.wasPressedThisFrame || Keyboard.current.leftShiftKey.wasPressedThisFrame) brakePressed = true;
            }
            if (Mouse.current != null)
            {
                if (Mouse.current.rightButton.wasPressedThisFrame) brakePressed = true;
            }
#else
            if (Input.GetKeyDown(KeyCode.Space)) boostPressed = true;
            if (Input.GetKeyDown(KeyCode.B) || Input.GetMouseButtonDown(1)) brakePressed = true;
#endif

            if (boostPressed)
            {
                TriggerAfterburnerSkill();
            }
            else if (brakePressed)
            {
                TriggerAnchorBrakeSkill();
            }
        }

        public void TriggerAfterburnerSkill()
        {
            if (usedMidShotSkill) return;
            usedMidShotSkill = true;

            Vector3 boostDir = rb.linearVelocity.sqrMagnitude > 0.5f ? rb.linearVelocity.normalized : transform.forward;
            var enemy = GameObject.Find("Enemy_Eraser");
            if (enemy != null)
            {
                Vector3 toEnemy = enemy.transform.position - transform.position;
                toEnemy.y = 0f;
                if (toEnemy.sqrMagnitude > 0.1f)
                {
                    boostDir = Vector3.Lerp(boostDir, toEnemy.normalized, 0.65f).normalized;
                }
            }

            transform.rotation = Quaternion.LookRotation(boostDir, Vector3.up);
            rb.AddForce(boostDir * 16f * rb.mass, ForceMode.Impulse);

            if (ImpactEffectSpawner.Instance != null)
            {
                ImpactEffectSpawner.Instance.SpawnBoostBurst(transform.position, boostDir, new Color(0f, 0.9f, 1f));
            }

            var hud = FindAnyObjectByType<BattleHUD>();
            if (hud != null) hud.ShowCombatCallout("🚀 TAPE AFTERBURNER!! 🚀");
        }

        public void TriggerAnchorBrakeSkill()
        {
            if (usedMidShotSkill) return;
            usedMidShotSkill = true;

            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;

            if (ImpactEffectSpawner.Instance != null)
            {
                ImpactEffectSpawner.Instance.SpawnBoostBurst(transform.position, Vector3.up, new Color(1f, 0.8f, 0.1f));
            }

            var hud = FindAnyObjectByType<BattleHUD>();
            if (hud != null) hud.ShowCombatCallout("⚓ PUSHPIN ANCHOR BRAKE!! ⚓");
        }

        private void CancelAim()
        {
            isAiming = false;
            currentPullRatio = 0f;
            if (trajectoryLine != null) trajectoryLine.enabled = false;
            if (slingshotBandLine != null) slingshotBandLine.enabled = false;
        }

        public void StopTrail()
        {
            if (boostTrail != null) boostTrail.emitting = false;
        }
    }
}
