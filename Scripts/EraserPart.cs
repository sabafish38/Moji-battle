using UnityEngine;

namespace Cyberasur.Core
{
    public class EraserPart : MonoBehaviour
    {
        [Header("Part Identity")]
        public string partName = "Custom Part";
        public SlotType slotType;
        [SerializeField] private float massBonus = 0.5f;
        [SerializeField] private float durability = 50f;

        public float MassBonus => massBonus;
        public float Durability => durability;

        private EraserPartSlot parentSlot;
        private bool isDetached = false;

        public void Initialize(EraserPartSlot slot)
        {
            parentSlot = slot;
            isDetached = false;
        }

        public void OnDetach(Vector3 blastImpulse)
        {
            if (isDetached) return;
            isDetached = true;

            // Unparent from eraser core
            transform.SetParent(null);

            // Add dynamic rigidbody to fly away with physics
            Rigidbody rb = gameObject.AddComponent<Rigidbody>();
            rb.mass = massBonus;
            rb.interpolation = RigidbodyInterpolation.Interpolate;

            // Add wild spinning and fly-off impulse
            rb.AddForce(blastImpulse + Vector3.up * 5f, ForceMode.Impulse);
            rb.AddTorque(Random.insideUnitSphere * 20f, ForceMode.Impulse);

            // Auto cleanup after 5 seconds
            Destroy(gameObject, 5f);
        }
    }
}
