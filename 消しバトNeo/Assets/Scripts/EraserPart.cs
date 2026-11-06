using UnityEngine;
using Cyberasur.FX;

namespace Cyberasur.Core
{
    public enum SlotType
    {
        Front,  // 衝角 (ホッチキス、画鋲)
        Side,   // 装甲 (クリップ)
        Rear,   // 推進器 (スラスター)
        Top     // 特殊兵装 (コンパス、修正テープ)
    }

    public class EraserPart : MonoBehaviour
    {
        [Header("Part Identity")]
        public string partName = "Custom Part";
        public SlotType slotType;
        [SerializeField] private float massBonus = 0.25f;

        public float MassBonus => massBonus;

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

            if (CyberAudioSynthesizer.Instance != null)
            {
                CyberAudioSynthesizer.Instance.PlayPartDetach();
            }

            if (ImpactEffectSpawner.Instance != null)
            {
                ImpactEffectSpawner.Instance.SpawnSparks(transform.position, Vector3.up, blastImpulse.magnitude);
            }

            transform.SetParent(null);

            var col = GetComponent<Collider>();
            if (col == null)
            {
                col = gameObject.AddComponent<BoxCollider>();
            }
            col.enabled = true;

            var rb = gameObject.GetComponent<Rigidbody>();
            if (rb == null) rb = gameObject.AddComponent<Rigidbody>();
            rb.mass = massBonus;
            rb.interpolation = RigidbodyInterpolation.Interpolate;

            rb.AddForce(blastImpulse, ForceMode.Impulse);
            rb.AddTorque(Random.insideUnitSphere * 35f, ForceMode.Impulse);

            Destroy(gameObject, 5f);
        }
    }
}
