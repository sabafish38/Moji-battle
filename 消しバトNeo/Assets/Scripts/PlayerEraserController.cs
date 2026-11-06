using System.Collections;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Cyberasur.Core
{
    [RequireComponent(typeof(Rigidbody))]
    [RequireComponent(typeof(EraserStats))]
    public class PlayerEraserController : MonoBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private float moveSpeed = 16f;
        [SerializeField] private float turnSpeed = 420f;
        [SerializeField] private float driftFriction = 0.94f;

        [Header("Quick Boost (QB)")]
        [SerializeField] private float qbImpulse = 24f;
        [SerializeField] private float qbEnCost = 25f;
        [SerializeField] private float qbCooldown = 0.5f;

        [Header("Charge Boost Settings")]
        [SerializeField] private float maxBoostForce = 40f;
        [SerializeField] private float chargeRate = 32f;
        [SerializeField] private float chargeEnCost = 35f;

        [Header("State")]
        public float currentCharge = 0f;
        public bool isCharging = false;
        private bool canQB = true;

        private Rigidbody rb;
        private EraserStats stats;
        private Vector3 inputDirection;
        private TrailRenderer boostTrail;

        public float CurrentChargeRatio => Mathf.Clamp01(currentCharge / maxBoostForce);

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            stats = GetComponent<EraserStats>();
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;

            SetupBoostTrail();
        }

        private void SetupBoostTrail()
        {
            boostTrail = GetComponent<TrailRenderer>();
            if (boostTrail == null)
            {
                boostTrail = gameObject.AddComponent<TrailRenderer>();
                boostTrail.time = 0.35f;
                boostTrail.startWidth = 1.0f;
                boostTrail.endWidth = 0.05f;
                boostTrail.emitting = false;

                var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
                if (shader == null) shader = Shader.Find("Sprites/Default");
                if (shader != null)
                {
                    var mat = new Material(shader);
                    mat.SetColor("_BaseColor", new Color(0.2f, 0.9f, 1f, 0.8f));
                    mat.EnableKeyword("_EMISSION");
                    mat.SetColor("_EmissionColor", new Color(0.1f, 0.8f, 1f) * 2f);
                    boostTrail.material = mat;
                }
            }
        }

        private void Update()
        {
            if (stats.isStaggered)
            {
                isCharging = false;
                currentCharge = 0f;
                return;
            }

            HandleInput();
        }

        private void FixedUpdate()
        {
            if (stats.isStaggered) return;

            ApplyMovement();
            ApplyDriftFriction();
        }

        private void HandleInput()
        {
            float h = 0f;
            float v = 0f;
            bool chargeDown = false;
            bool chargeUp = false;
            bool qbTrigger = false;
            bool parryTrigger = false;

#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            var mouse = Mouse.current;
            if (kb != null)
            {
                if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) h -= 1f;
                if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) h += 1f;
                if (kb.wKey.isPressed || kb.upArrowKey.isPressed) v += 1f;
                if (kb.sKey.isPressed || kb.downArrowKey.isPressed) v -= 1f;

                if (kb.spaceKey.wasPressedThisFrame) chargeDown = true;
                if (kb.spaceKey.wasReleasedThisFrame) chargeUp = true;
                if (kb.leftShiftKey.wasPressedThisFrame) qbTrigger = true;
                if (kb.eKey.wasPressedThisFrame || kb.qKey.wasPressedThisFrame) parryTrigger = true;
            }
            if (mouse != null)
            {
                if (mouse.leftButton.wasPressedThisFrame) chargeDown = true;
                if (mouse.leftButton.wasReleasedThisFrame) chargeUp = true;
                if (mouse.rightButton.wasPressedThisFrame) qbTrigger = true;
            }
#else
            h = Input.GetAxisRaw("Horizontal");
            v = Input.GetAxisRaw("Vertical");
            chargeDown = Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0);
            chargeUp = Input.GetKeyUp(KeyCode.Space) || Input.GetMouseButtonUp(0);
            qbTrigger = Input.GetKeyDown(KeyCode.LeftShift) || Input.GetMouseButtonDown(1);
            parryTrigger = Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.Q);
#endif

            inputDirection = new Vector3(h, 0f, v).normalized;

            // 1. Parry action
            if (parryTrigger)
            {
                stats.ActivateParry();
            }

            // 2. Quick Boost (QB)
            if (qbTrigger && canQB)
            {
                ExecuteQuickBoost();
            }

            // 3. Charge Boost
            if (chargeDown && !stats.isOverheated)
            {
                isCharging = true;
                currentCharge = 0f;
            }

            if (isCharging)
            {
                currentCharge += chargeRate * Time.deltaTime;
                if (currentCharge >= maxBoostForce)
                {
                    currentCharge = maxBoostForce;
                }
            }

            if (chargeUp && isCharging)
            {
                ExecuteChargeBoost();
            }
        }

        private void ApplyMovement()
        {
            if (inputDirection.sqrMagnitude > 0.01f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(inputDirection, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRotation, turnSpeed * Time.fixedDeltaTime);

                if (!isCharging)
                {
                    float speedFactor = stats.isOverheated ? 0.6f : 1.0f;
                    rb.AddForce(inputDirection * moveSpeed * speedFactor, ForceMode.Acceleration);
                }
            }
        }

        private void ApplyDriftFriction()
        {
            Vector3 forward = transform.forward;
            Vector3 lateral = transform.right;

            Vector3 currentVel = rb.linearVelocity;
            float forwardMag = Vector3.Dot(currentVel, forward);
            float lateralMag = Vector3.Dot(currentVel, lateral);

            lateralMag *= driftFriction;

            rb.linearVelocity = (forward * forwardMag) + (lateral * lateralMag);
        }

        private void ExecuteQuickBoost()
        {
            if (!stats.TryConsumeEN(qbEnCost)) return;

            Vector3 qbDir = inputDirection.sqrMagnitude > 0.01f ? inputDirection : transform.forward;
            rb.AddForce(qbDir * qbImpulse, ForceMode.Impulse);

            if (boostTrail != null) boostTrail.emitting = true;
            StartCoroutine(QBCooldownRoutine());
        }

        private IEnumerator QBCooldownRoutine()
        {
            canQB = false;
            yield return new WaitForSeconds(0.2f);
            if (!isCharging && boostTrail != null) boostTrail.emitting = false;
            yield return new WaitForSeconds(qbCooldown - 0.2f);
            canQB = true;
        }

        private void ExecuteChargeBoost()
        {
            isCharging = false;

            if (!stats.TryConsumeEN(chargeEnCost * (currentCharge / maxBoostForce)))
            {
                currentCharge = 0f;
                return;
            }

            if (boostTrail != null) boostTrail.emitting = true;

            Vector3 boostDirection = transform.forward;
            rb.AddForce(boostDirection * currentCharge, ForceMode.Impulse);

            currentCharge = 0f;
            StartCoroutine(BoostTrailCooldownRoutine());
        }

        private IEnumerator BoostTrailCooldownRoutine()
        {
            yield return new WaitForSeconds(0.4f);
            if (boostTrail != null) boostTrail.emitting = false;
        }
    }
}
