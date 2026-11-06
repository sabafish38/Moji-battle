using System.Collections.Generic;
using UnityEngine;

namespace Cyberasur.Core
{
    public class EraserPartSlot : MonoBehaviour
    {
        private List<EraserPart> attachedParts = new List<EraserPart>();
        private Rigidbody rb;

        private void Awake()
        {
            rb = GetComponent<Rigidbody>();
            // Auto register children parts if pre-configured
            foreach (var part in GetComponentsInChildren<EraserPart>())
            {
                if (!attachedParts.Contains(part))
                {
                    part.Initialize(this);
                    attachedParts.Add(part);
                }
            }
        }

        public void RegisterPart(EraserPart part)
        {
            if (!attachedParts.Contains(part))
            {
                part.Initialize(this);
                attachedParts.Add(part);
                if (rb != null) rb.mass += part.MassBonus;
            }
        }

        public void TryDetachClosestPart(Vector3 hitPoint, float impactSpeed)
        {
            if (attachedParts.Count == 0) return;

            EraserPart targetPart = null;
            float minDistance = float.MaxValue;

            for (int i = attachedParts.Count - 1; i >= 0; i--)
            {
                var part = attachedParts[i];
                if (part == null)
                {
                    attachedParts.RemoveAt(i);
                    continue;
                }

                float dist = Vector3.Distance(part.transform.position, hitPoint);
                if (dist < minDistance)
                {
                    minDistance = dist;
                    targetPart = part;
                }
            }

            if (targetPart != null)
            {
                Vector3 blastDir = (targetPart.transform.position - transform.position).normalized;
                blastDir += Vector3.up * 0.8f;
                DetachPart(targetPart, blastDir * (impactSpeed * 0.7f));
            }
        }

        public void DetachPart(EraserPart part, Vector3 blastImpulse)
        {
            if (!attachedParts.Contains(part)) return;

            attachedParts.Remove(part);
            if (rb != null)
            {
                rb.mass = Mathf.Max(0.8f, rb.mass - part.MassBonus);
            }

            part.OnDetach(blastImpulse);
        }
    }
}
