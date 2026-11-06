using System.Collections;
using UnityEngine;

namespace Cyberasur.Core
{
    [RequireComponent(typeof(Rigidbody))]
    public class PlayerEraserController : MonoBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private float moveSpeed = 15f;
        [SerializeField] private float turnSpeed = 360f;
        [SerializeField] private float driftFriction = 0.95f;

        [Header("Boost Settings")]
        [SerializeField] private float maxBoostForce = 35f;
        [SerializeField] private float chargeRate = 25f;
        [SerializeField] private float boostCooldown = 0.8f;

        [Header("State")]
        public float currentCharge = 0f;
        public bool isCharging = false;
        public bool canBoost = true;

        private Rigidbody rb;
        private Vector3 inputDirection;

        public float CurrentChargeRatio => Mathf.Clamp01(currentCharge / maxBoostForce);

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;
        }

        private void Update()
        {
            HandleInput();
        }

        private void FixedUpdate()
        {
            ApplyMovement();
            ApplyDriftFriction();
        }

        private void HandleInput()
        {
            float h = Input.GetAxisRaw("Horizontal");
            float v = Input.GetAxisRaw("Vertical");
            inputDirection = new Vector3(h, 0f, v).normalized;

            // Space key or Mouse Left Click to charge boost
            if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0))
            {
                if (canBoost)
                {
                    isCharging = true;
                    currentCharge = 0f;
                }
            }

            if (isCharging)
            {
                currentCharge += chargeRate * Time.deltaTime;
                if (currentCharge >= maxBoostForce)
                {
                    currentCharge = maxBoostForce;
                }
            }

            if (Input.GetKeyUp(KeyCode.Space) || Input.GetMouseButtonUp(0))
            {
                if (isCharging)
                {
                    ExecuteBoost();
                }
            }
        }

        private void ApplyMovement()
        {
            if (inputDirection.sqrMagnitude > 0.01f)
            {
                // Smooth rotation towards input direction
                Quaternion targetRotation = Quaternion.LookRotation(inputDirection, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRotation, turnSpeed * Time.fixedDeltaTime);

                // Add acceleration force
                if (!isCharging)
                {
                    rb.AddForce(inputDirection * moveSpeed, ForceMode.Acceleration);
                }
            }
        }

        private void ApplyDriftFriction()
        {
            // Erase lateral velocity to simulate realistic eraser drift physics
            Vector3 forward = transform.forward;
            Vector3 lateral = transform.right;

            Vector3 currentVel = rb.linearVelocity;
            float forwardMag = Vector3.Dot(currentVel, forward);
            float lateralMag = Vector3.Dot(currentVel, lateral);

            // Dampen lateral speed more than forward speed for snappy drift
            lateralMag *= driftFriction;

            rb.linearVelocity = (forward * forwardMag) + (lateral * lateralMag);
        }

        private void ExecuteBoost()
        {
            isCharging = false;
            canBoost = false;

            // Rocket-propelled forward dash
            Vector3 boostDirection = transform.forward;
            rb.AddForce(boostDirection * currentCharge, ForceMode.Impulse);

            currentCharge = 0f;
            StartCoroutine(BoostCooldownRoutine());
        }

        private IEnumerator BoostCooldownRoutine()
        {
            yield return new WaitForSeconds(boostCooldown);
            canBoost = true;
        }
    }
}
