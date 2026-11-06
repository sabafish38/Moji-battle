using System;
using UnityEngine;

namespace Cyberasur.Core
{
    [RequireComponent(typeof(Rigidbody))]
    public class BumperPhysics : MonoBehaviour
    {
        [Header("Impact Settings")]
        [SerializeField] private float bounceMultiplier = 1.6f;
        [SerializeField] private float minImpactSpeedForSparks = 5f;
        [SerializeField] private float partDetachThreshold = 18f;

        [Header("Audio & FX Events")]
        public event Action<Vector3, float> OnClashImpact;
        public event Action<Vector3> OnHeavyImpact;

        private Rigidbody rb;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
        }

        private void OnCollisionEnter(Collision collision)
        {
            // Only process clash against another eraser or environment bumper
            Rigidbody otherRb = collision.rigidbody;
            float relativeSpeed = collision.relativeVelocity.magnitude;

            if (relativeSpeed < 1f) return;

            Vector3 hitPoint = collision.contacts[0].point;
            Vector3 hitNormal = collision.contacts[0].normal;

            // Trigger impact effects
            if (relativeSpeed >= minImpactSpeedForSparks)
            {
                OnClashImpact?.Invoke(hitPoint, relativeSpeed);
            }

            // High impact causes camera shake and part detach checks
            if (relativeSpeed >= partDetachThreshold)
            {
                OnHeavyImpact?.Invoke(hitPoint);
                CheckPartDetachment(relativeSpeed, hitPoint);
            }

            // Exaggerate physics bounce for arcade tactile feel
            if (otherRb != null)
            {
                Vector3 bounceImpulse = hitNormal * relativeSpeed * bounceMultiplier * rb.mass;
                rb.AddForce(bounceImpulse, ForceMode.Impulse);
            }
        }

        private void CheckPartDetachment(float impactSpeed, Vector3 hitPoint)
        {
            EraserPartSlot partSlot = GetComponent<EraserPartSlot>();
            if (partSlot != null)
            {
                partSlot.TryDetachClosestPart(hitPoint, impactSpeed);
            }
        }
    }
}
