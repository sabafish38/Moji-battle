using System;
using System.Collections;
using UnityEngine;
using Cyberasur.FX;

namespace Cyberasur.Core
{
    public enum ChassisType
    {
        Balanced_Mono,   // 標準バランス型: MONO-EX01 (2段アフターバーナー搭載)
        Heavy_Titan,     // 超重量要塞型: JUMBO-TITAN (高質量・正面激突威力1.5倍)
        Speed_Phantom    // 高速高反発型: KNOCK-PHANTOM (超高速・壁バウンド加速)
    }

    public enum SpinType
    {
        TopSpin,         // トップスピン: 激突後も前へ押し込む突進回転
        NoSpin,          // ノーマル: 直進安定ショット
        BackSpin         // バックスピン: 激突後に急ブレーキして自滅を防ぐ
    }

    [RequireComponent(typeof(Rigidbody))]
    public class EraserStats : MonoBehaviour
    {
        [Header("Chassis & Build")]
        public ChassisType chassisType = ChassisType.Balanced_Mono;
        public SpinType selectedSpin = SpinType.NoSpin;
        public string machineTitle = "MONO-EX01 // CYBER";

        [Header("Armor Points (AP)")]
        [SerializeField] private float maxAP = 1000f;
        public float currentAP;

        [Header("Energy (EN)")]
        [SerializeField] private float maxEN = 100f;
        [SerializeField] private float enRecoveryRate = 30f;
        public float currentEN;
        public bool isOverheated = false;

        [Header("Stagger / Posture")]
        [SerializeField] private float maxStagger = 100f;
        [SerializeField] private float staggerRecoveryRate = 12f;
        [SerializeField] private float staggerDuration = 1.5f;
        public float currentStagger = 0f;
        public bool isStaggered = false;

        [Header("Defense / Parry")]
        public bool isParrying = false;
        [SerializeField] private float parryWindow = 0.3f;

        [Header("Combat Multipliers")]
        public float attackPowerMultiplier = 1.0f;
        public float knockbackResistance = 1.0f;
        public float launchSpeedMultiplier = 1.0f;

        public event Action<float, float> OnAPChanged;
        public event Action<float, float> OnENChanged;
        public event Action<float, float> OnStaggerChanged;
        public event Action OnStaggerTriggered;
        public event Action OnParrySuccess;
        public event Action OnDeath;

        public float MaxAP => maxAP;
        public float MaxEN => maxEN;
        public float MaxStagger => maxStagger;

        private Rigidbody rb;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            ApplyChassisStats(chassisType);
        }

        public void ApplyChassisStats(ChassisType type)
        {
            chassisType = type;
            if (rb == null) rb = GetComponent<Rigidbody>();

            switch (type)
            {
                case ChassisType.Balanced_Mono:
                    machineTitle = "MONO-EX01 [BALANCED]";
                    maxAP = 1000f;
                    rb.mass = 1.35f;
                    rb.linearDamping = 1.15f;
                    rb.angularDamping = 2.0f;
                    attackPowerMultiplier = 1.15f;
                    knockbackResistance = 1.0f;
                    launchSpeedMultiplier = 1.05f;
                    transform.localScale = new Vector3(1.0f, 1.0f, 1.0f);
                    break;

                case ChassisType.Heavy_Titan:
                    machineTitle = "JUMBO-TITAN [HEAVY AC]";
                    maxAP = 1400f;
                    rb.mass = 2.1f;
                    rb.linearDamping = 1.45f;
                    rb.angularDamping = 2.8f;
                    attackPowerMultiplier = 1.45f;
                    knockbackResistance = 1.5f;
                    launchSpeedMultiplier = 0.88f;
                    transform.localScale = new Vector3(1.22f, 1.15f, 1.15f);
                    break;

                case ChassisType.Speed_Phantom:
                    machineTitle = "KNOCK-PHANTOM [SPEED]";
                    maxAP = 850f;
                    rb.mass = 0.95f;
                    rb.linearDamping = 0.85f;
                    rb.angularDamping = 1.6f;
                    attackPowerMultiplier = 1.05f;
                    knockbackResistance = 0.8f;
                    launchSpeedMultiplier = 1.32f;
                    transform.localScale = new Vector3(0.88f, 0.92f, 1.18f);
                    break;
            }

            currentAP = maxAP;
            currentEN = maxEN;
            currentStagger = 0f;
            isStaggered = false;
            isOverheated = false;
        }

        private void Update()
        {
            RegenerateEN();
            RecoverStagger();
        }

        private void RegenerateEN()
        {
            if (isOverheated) return;
            if (currentEN < maxEN)
            {
                currentEN = Mathf.Min(maxEN, currentEN + enRecoveryRate * Time.deltaTime);
                OnENChanged?.Invoke(currentEN, maxEN);
            }
        }

        private void RecoverStagger()
        {
            if (isStaggered) return;
            if (currentStagger > 0f)
            {
                currentStagger = Mathf.Max(0f, currentStagger - staggerRecoveryRate * Time.deltaTime);
                OnStaggerChanged?.Invoke(currentStagger, maxStagger);
            }
        }

        public bool TryConsumeEN(float amount)
        {
            if (isOverheated) return false;
            if (currentEN >= amount)
            {
                currentEN -= amount;
                OnENChanged?.Invoke(currentEN, maxEN);
                return true;
            }
            else
            {
                StartCoroutine(OverheatRoutine());
                return false;
            }
        }

        private IEnumerator OverheatRoutine()
        {
            isOverheated = true;
            currentEN = 0f;
            OnENChanged?.Invoke(currentEN, maxEN);
            yield return new WaitForSeconds(1.8f);
            isOverheated = false;
        }

        public void TakeImpact(float damage, float impactStagger, Vector3 hitPoint)
        {
            if (isParrying)
            {
                OnParrySuccess?.Invoke();
                if (ImpactEffectSpawner.Instance != null)
                {
                    ImpactEffectSpawner.Instance.SpawnSparks(hitPoint, Vector3.up, 25f);
                }
                return;
            }

            float actualDamage = isStaggered ? damage * 1.8f : damage;
            currentAP = Mathf.Max(0f, currentAP - actualDamage);
            OnAPChanged?.Invoke(currentAP, maxAP);

            if (!isStaggered)
            {
                currentStagger += impactStagger;
                OnStaggerChanged?.Invoke(currentStagger, maxStagger);

                if (currentStagger >= maxStagger)
                {
                    StartCoroutine(TriggerStaggerRoutine());
                }
            }

            if (currentAP <= 0f)
            {
                OnDeath?.Invoke();
            }
        }

        public void ForceStagger()
        {
            StartCoroutine(TriggerStaggerRoutine());
        }

        private IEnumerator TriggerStaggerRoutine()
        {
            isStaggered = true;
            currentStagger = maxStagger;
            OnStaggerTriggered?.Invoke();

            if (CameraShaker.Instance != null)
            {
                CameraShaker.Instance.Shake(0.35f, 0.7f);
            }

            yield return new WaitForSeconds(staggerDuration);

            isStaggered = false;
            currentStagger = 0f;
            OnStaggerChanged?.Invoke(currentStagger, maxStagger);
        }

        public void ActivateParry()
        {
            if (isParrying || isStaggered || isOverheated) return;
            if (TryConsumeEN(20f))
            {
                StartCoroutine(ParryRoutine());
            }
        }

        private IEnumerator ParryRoutine()
        {
            isParrying = true;
            yield return new WaitForSeconds(parryWindow);
            isParrying = false;
        }
    }
}
