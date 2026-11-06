using System.Collections;
using UnityEngine;
using Cyberasur.Core;
using Cyberasur.FX;

namespace Cyberasur.AI
{
    [RequireComponent(typeof(Rigidbody))]
    public class TurnEnemyAI : MonoBehaviour
    {
        [Header("Tactical AI Settings")]
        [SerializeField] private float minForce = 12f;
        [SerializeField] private float maxForce = 24f;
        [SerializeField] private float aimDuration = 0.65f; // テンポ向上のため思考時間を短縮

        private Rigidbody rb;
        private EraserStats stats;
        private Transform playerTarget;
        private LineRenderer laserSight;
        private TrailRenderer boostTrail;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            stats = GetComponent<EraserStats>();

            // 水平滑走を保証 (ひっくり返り防止)
            rb.constraints = RigidbodyConstraints.FreezeRotationX | RigidbodyConstraints.FreezeRotationZ | RigidbodyConstraints.FreezePositionY;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;

            SetupLaserSight();
            SetupBoostTrail();
        }

        private void SetupLaserSight()
        {
            laserSight = GetComponent<LineRenderer>();
            if (laserSight == null) laserSight = gameObject.AddComponent<LineRenderer>();
            laserSight.positionCount = 2;
            laserSight.startWidth = 0.16f;
            laserSight.endWidth = 0.04f;
            laserSight.useWorldSpace = true;
            laserSight.enabled = false;

            var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (shader == null) shader = Shader.Find("Sprites/Default");
            if (shader != null)
            {
                var mat = new Material(shader);
                Color c = new Color(1f, 0.15f, 0.45f, 0.95f);
                mat.SetColor("_BaseColor", c);
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", c * 3.5f);
                laserSight.material = mat;
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
                Color c = new Color(1f, 0.2f, 0.45f, 0.85f);
                mat.SetColor("_BaseColor", c);
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", c * 2.5f);
                boostTrail.material = mat;
            }
        }

        public void ExecuteAITurn()
        {
            StopAllCoroutines();
            StartCoroutine(AITurnRoutine());
        }

        private IEnumerator AITurnRoutine()
        {
            if (stats != null && stats.isStaggered)
            {
                yield return new WaitForSeconds(0.4f);
                stats.isStaggered = false;
                stats.currentStagger = 0f;
            }

            if (playerTarget == null)
            {
                var p = GameObject.Find("Player_Eraser");
                if (p != null) playerTarget = p.transform;
            }

            if (playerTarget == null)
            {
                TurnBattleManager.Instance.StartPlayerTurn();
                yield break;
            }

            Vector3 myPos = transform.position;
            Vector3 pPos = playerTarget.position;

            // ★ インテリジェント戦術計算:
            // プレイヤーを「机の最も近いフチ」へ叩き落とす角度を逆算して狙う！
            Vector3 targetPushDir = GetNearestEdgeDirection(pPos);

            // プレイヤーの中心から、押したい方向の反対側 (打点) を狙う
            Vector3 aimTargetPoint = pPos - targetPushDir * 0.4f;
            Vector3 toAimTarget = (aimTargetPoint - myPos);
            toAimTarget.y = 0f;

            // 間に障害物 (定規) がある場合のコース修正
            if (Physics.Raycast(myPos + Vector3.up * 0.1f, toAimTarget.normalized, out RaycastHit hit, toAimTarget.magnitude))
            {
                if (hit.collider.gameObject.name.Contains("Ruler") || hit.collider.gameObject.name.Contains("Glue"))
                {
                    // 障害物の角をすり抜けるように少しオフセット
                    toAimTarget += Vector3.Cross(Vector3.up, toAimTarget.normalized) * 1.2f;
                }
            }

            // 自殺防止: 自機が机の端に近い時は BackSpin を選択
            bool mySelfNearEdge = Mathf.Abs(myPos.x) > 5.5f || Mathf.Abs(myPos.z) > 3.8f;
            if (stats != null)
            {
                stats.selectedSpin = mySelfNearEdge ? SpinType.BackSpin : SpinType.TopSpin;
            }

            Vector3 finalAimDir = toAimTarget.normalized;
            float dist = toAimTarget.magnitude;

            // 赤いレーザーサイトによるロックオン予告演出
            laserSight.enabled = true;
            Quaternion startRot = transform.rotation;
            Quaternion targetRot = Quaternion.LookRotation(finalAimDir, Vector3.up);

            float elapsed = 0f;
            while (elapsed < aimDuration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / aimDuration);
                transform.rotation = Quaternion.Slerp(startRot, targetRot, t * t);

                Vector3 origin = transform.position + Vector3.up * 0.1f;
                laserSight.SetPosition(0, origin);
                laserSight.SetPosition(1, origin + transform.forward * Mathf.Min(dist + 2.5f, 12f));
                yield return null;
            }

            laserSight.enabled = false;
            if (boostTrail != null) boostTrail.emitting = true;

            // 距離に応じた適正パワー (オーバーキル・自滅を防ぐ)
            float force = Mathf.Clamp(dist * 3.2f, minForce, maxForce);
            rb.linearVelocity = Vector3.zero;
            rb.angularVelocity = Vector3.zero;
            rb.AddForce(finalAimDir * force * rb.mass, ForceMode.Impulse);

            if (CyberAudioSynthesizer.Instance != null)
            {
                CyberAudioSynthesizer.Instance.PlayLaunch();
            }

            TurnBattleManager.Instance.OnEntityLaunched();

            yield return new WaitForSeconds(0.6f);
            if (boostTrail != null) boostTrail.emitting = false;
        }

        private Vector3 GetNearestEdgeDirection(Vector3 pos)
        {
            // 机の範囲: X: -8 〜 +8, Z: -5.5 〜 +5.5
            float distToRight = 8.0f - pos.x;
            float distToLeft = pos.x - (-8.0f);
            float distToTop = 5.5f - pos.z;
            float distToBottom = pos.z - (-5.5f);

            float minDist = Mathf.Min(Mathf.Min(distToRight, distToLeft), Mathf.Min(distToTop, distToBottom));

            if (Mathf.Approximately(minDist, distToRight)) return Vector3.right;
            if (Mathf.Approximately(minDist, distToLeft)) return Vector3.left;
            if (Mathf.Approximately(minDist, distToTop)) return Vector3.forward;
            return Vector3.back;
        }
    }
}
