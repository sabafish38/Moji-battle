using System;
using UnityEngine;
using Cyberasur.FX;
using Cyberasur.UI;

namespace Cyberasur.Core
{
    [RequireComponent(typeof(Rigidbody))]
    public class BumperPhysics : MonoBehaviour
    {
        [Header("Tuned Impact Settings (No One-Shot Kill)")]
        [SerializeField] private float baseKnockbackMultiplier = 0.48f; // 大幅にマイルド化
        [SerializeField] private float minImpactSpeedForSparks = 2.0f;
        [SerializeField] private float heavyImpactThreshold = 9f;

        public event Action<Vector3, float> OnClashImpact;
        public event Action<Vector3> OnHeavyImpact;

        private Rigidbody rb;
        private EraserStats myStats;
        private float lastClashTime = -10f;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            myStats = GetComponent<EraserStats>();
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (collision.gameObject.name.Contains("Desk_Surface") || collision.gameObject.name.Contains("Desk"))
                return;

            float relativeSpeed = collision.relativeVelocity.magnitude;
            if (relativeSpeed < 1.0f) return;

            Vector3 hitPoint = collision.contacts[0].point;
            Vector3 hitNormal = collision.contacts[0].normal;
            hitNormal.y = 0f;
            if (hitNormal.sqrMagnitude > 0.001f) hitNormal.Normalize();

            // 1. 壁・定規・障害物との衝突
            if (collision.rigidbody == null)
            {
                if (collision.gameObject.name.Contains("Bumper") || collision.gameObject.name.Contains("Ruler") || collision.gameObject.name.Contains("Glue"))
                {
                    if (ImpactEffectSpawner.Instance != null)
                    {
                        ImpactEffectSpawner.Instance.SpawnSparks(hitPoint, hitNormal, relativeSpeed * 0.7f);
                    }
                    float wallBounce = (myStats != null && myStats.chassisType == ChassisType.Speed_Phantom) ? 0.95f : 0.7f;
                    rb.AddForce(hitNormal * relativeSpeed * wallBounce * rb.mass, ForceMode.Impulse);
                }
                return;
            }

            // 同フレーム二重処理防止
            if (Time.time - lastClashTime < 0.05f) return;
            lastClashTime = Time.time;

            EraserStats otherStats = collision.gameObject.GetComponent<EraserStats>();
            Rigidbody otherRb = collision.rigidbody;

            float mySpeed = rb.linearVelocity.magnitude;
            float otherSpeed = otherRb != null ? otherRb.linearVelocity.magnitude : 0f;
            bool iAmAttacker = mySpeed >= otherSpeed;

            if (iAmAttacker && otherStats != null && otherRb != null)
            {
                float atkMult = myStats != null ? myStats.attackPowerMultiplier : 1.0f;
                float defRes = otherStats.knockbackResistance;

                // 装甲による吹っ飛び軽減計算 (初手即死を完全に防止)
                // パーツが多いほど安定し、スタッガー時のみ吹き飛ぶ
                float armorFactor = 0.55f; // 基本は踏ん張りが効く (机の端へ少しずつ押し込むラリー感)
                if (otherStats.isStaggered)
                {
                    armorFactor = 1.35f; // スタッガー時のみフィニッシュ可能な大吹っ飛び
                }

                // APダメージ・スタッガー蓄積
                float damage = relativeSpeed * 12f * atkMult;
                float staggerDmg = relativeSpeed * 3.2f * atkMult;
                otherStats.TakeImpact(damage, staggerDmg, hitPoint);

                // ノックバック計算 (初手で机から一撃落ちしない適正な力積)
                Vector3 pushDir = (otherRb.transform.position - transform.position);
                pushDir.y = 0f;
                if (pushDir.sqrMagnitude < 0.001f) pushDir = -hitNormal;
                pushDir.Normalize();

                float pushImpulse = relativeSpeed * baseKnockbackMultiplier * atkMult * armorFactor / Mathf.Max(0.5f, defRes);
                otherRb.AddForce(pushDir * pushImpulse * otherRb.mass, ForceMode.Impulse);
                otherRb.AddTorque(Vector3.up * UnityEngine.Random.Range(-5f, 5f), ForceMode.Impulse);

                // 攻撃側のリバウンド (自滅・自爆を防ぐ安全設計)
                if (myStats != null)
                {
                    switch (myStats.selectedSpin)
                    {
                        case SpinType.BackSpin:
                            rb.linearVelocity = -pushDir * 1.5f;
                            break;
                        case SpinType.TopSpin:
                            rb.linearVelocity = pushDir * (relativeSpeed * 0.25f);
                            break;
                        case SpinType.NoSpin:
                        default:
                            rb.linearVelocity *= 0.15f;
                            break;
                    }
                }

                // スパーク・カメラ振動
                if (relativeSpeed >= minImpactSpeedForSparks)
                {
                    OnClashImpact?.Invoke(hitPoint, relativeSpeed);
                    if (ImpactEffectSpawner.Instance != null)
                    {
                        ImpactEffectSpawner.Instance.SpawnSparks(hitPoint, pushDir, relativeSpeed);
                    }
                    if (CameraShaker.Instance != null)
                    {
                        float shakeMag = Mathf.Clamp(relativeSpeed * 0.02f, 0.15f, 0.5f);
                        CameraShaker.Instance.Shake(0.2f, shakeMag);
                    }
                }

                // 強打撃時の演出とパーツ破損判定
                if (relativeSpeed >= heavyImpactThreshold || otherStats.isStaggered)
                {
                    OnHeavyImpact?.Invoke(hitPoint);
                    if (HitStopManager.Instance != null)
                    {
                        HitStopManager.Instance.TriggerHitStop(0.05f, 0.08f);
                    }

                    var hud = FindAnyObjectByType<BattleHUD>();
                    if (hud != null)
                    {
                        hud.ShowCombatCallout(otherStats.isStaggered ? "💥 STAGGER SMASH! 💥" : "⚡ CLASH HIT! ⚡");
                    }

                    // 一撃で全部脱落せず、強い衝撃時のみ1個ずつ脱落
                    EraserPartSlot targetSlot = otherStats.GetComponent<EraserPartSlot>();
                    if (targetSlot != null && relativeSpeed >= 12f)
                    {
                        targetSlot.TryDetachClosestPart(hitPoint, relativeSpeed * 0.6f);
                    }
                }
            }
        }
    }
}
