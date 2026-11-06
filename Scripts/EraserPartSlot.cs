using System.Collections.Generic;
using UnityEngine;

namespace Cyberasur.Core
{
    public enum SlotType
    {
        Front,  // 衝角 (ホッチキス、画鋲)
        Side,   // 装甲 (クリップ)
        Rear,   // 推進器 (スラスター)
        Top     // 特殊兵装 (コンパス、修正テープ)
    }

    public class EraserPartSlot : MonoBehaviour
    {
        [Header("Mount Sockets")]
        [SerializeField] private Transform frontSocket;
        [SerializeField] private Transform leftSocket;
        [SerializeField] private Transform rightSocket;
        [SerializeField] private Transform rearSocket;
        [SerializeField] private Transform topSocket;

        private List<EraserPart> attachedParts = new List<EraserPart>();
        private Rigidbody rb;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
        }

        public void EquipPart(EraserPart partPrefab, SlotType slot)
        {
            Transform targetSocket = slot switch
            {
                SlotType.Front => frontSocket,
                SlotType.Side => leftSocket,
                SlotType.Rear => rearSocket,
                SlotType.Top => topSocket,
                _ => transform
            };

            if (targetSocket == null) targetSocket = transform;

            EraserPart part = Instantiate(partPrefab, targetSocket);
            part.transform.localPosition = Vector3.zero;
            part.transform.localRotation = Quaternion.identity;

            part.Initialize(this);
            attachedParts.Add(part);

            // Update mass & physics
            rb.mass += part.MassBonus;
        }

        public void TryDetachClosestPart(Vector3 hitPoint, float impactForce)
        {
            if (attachedParts.Count == 0) return;

            EraserPart closestPart = null;
            float minDistance = float.MaxValue;

            foreach (var part in attachedParts)
            {
                float dist = Vector3.Distance(part.transform.position, hitPoint);
                if (dist < minDistance)
                {
                    minDistance = dist;
                    closestPart = part;
                }
            }

            if (closestPart != null)
            {
                DetachPart(closestPart, (hitPoint - transform.position).normalized * impactForce);
            }
        }

        public void DetachPart(EraserPart part, Vector3 blastImpulse)
        {
            if (!attachedParts.Contains(part)) return;

            attachedParts.Remove(part);
            rb.mass = Mathf.Max(0.5f, rb.mass - part.MassBonus);

            part.OnDetach(blastImpulse);
        }
    }
}
