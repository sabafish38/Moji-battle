using System.Collections;
using UnityEngine;
using Cyberasur.Core;

namespace Cyberasur.AI
{
    [RequireComponent(typeof(Rigidbody))]
    [RequireComponent(typeof(EraserStats))]
    public class EnemyAIController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float moveSpeed = 13f;
        [SerializeField] private float turnSpeed = 300f;
        [SerializeField] private float maxBoostForce = 34f;

        [Header("AI Behavior")]
        [SerializeField] private float attackRange = 8f;
        [SerializeField] private float chargeDuration = 1.0f;
        [SerializeField] private float attackCooldown = 2.2f;
        [SerializeField] private float edgeAvoidRadius = 6.2f;

        private Rigidbody rb;
        private EraserStats stats;
        private Transform playerTarget;
        private bool isAttacking = false;
        private bool canAttack = true;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            stats = GetComponent<EraserStats>();
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;
        }

        private void Start()
        {
            FindPlayer();
        }

        private void Update()
        {
            if (stats.isStaggered) return;

            if (playerTarget == null)
            {
                FindPlayer();
                return;
            }

            if (!isAttacking)
            {
                ThinkAndMove();
            }
        }

        private void FindPlayer()
        {
            var player = FindAnyObjectByType<PlayerEraserController>();
            if (player != null) playerTarget = player.transform;
        }

        private void ThinkAndMove()
        {
            Vector3 myPos = transform.position;

            // 1. Edge avoidance check (Desk edge safety)
            if (Mathf.Abs(myPos.x) > edgeAvoidRadius || Mathf.Abs(myPos.z) > edgeAvoidRadius)
            {
                Vector3 toCenter = (Vector3.zero - myPos);
                toCenter.y = 0;
                SteerTowards(toCenter.normalized);
                rb.AddForce(toCenter.normalized * moveSpeed, ForceMode.Acceleration);
                return;
            }

            // 2. Target acquisition
            Vector3 toPlayer = (playerTarget.position - myPos);
            toPlayer.y = 0;
            float distanceToPlayer = toPlayer.magnitude;

            SteerTowards(toPlayer.normalized);

            // 3. Attack decision
            float angleToPlayer = Vector3.Angle(transform.forward, toPlayer);
            if (distanceToPlayer <= attackRange && angleToPlayer < 25f && canAttack && !stats.isOverheated)
            {
                StartCoroutine(PerformChargeAttack());
            }
            else
            {
                // Patrol / Approach
                float speedFactor = stats.isOverheated ? 0.5f : 1.0f;
                rb.AddForce(transform.forward * moveSpeed * 0.75f * speedFactor, ForceMode.Acceleration);
            }
        }

        private void SteerTowards(Vector3 direction)
        {
            if (direction.sqrMagnitude < 0.001f) return;
            Quaternion targetRot = Quaternion.LookRotation(direction, Vector3.up);
            transform.rotation = Quaternion.RotateTowards(transform.rotation, targetRot, turnSpeed * Time.deltaTime);
        }

        private IEnumerator PerformChargeAttack()
        {
            isAttacking = true;
            canAttack = false;

            // Step back to telegraph charge
            rb.linearVelocity *= 0.2f;
            rb.AddForce(-transform.forward * 4f, ForceMode.Impulse);

            yield return new WaitForSeconds(chargeDuration);

            if (!stats.isStaggered && playerTarget != null)
            {
                // Charge boost!
                stats.TryConsumeEN(30f);
                Vector3 ramDir = (playerTarget.position - transform.position);
                ramDir.y = 0;
                rb.AddForce(ramDir.normalized * maxBoostForce, ForceMode.Impulse);
            }

            yield return new WaitForSeconds(0.6f);
            isAttacking = false;

            yield return new WaitForSeconds(attackCooldown);
            canAttack = true;
        }
    }
}
