using System.Collections;
using UnityEngine;

namespace Cyberasur.FX
{
    public class CameraShaker : MonoBehaviour
    {
        public static CameraShaker Instance { get; private set; }

        private Vector3 shakeOffset = Vector3.zero;
        public Vector3 ShakeOffset => shakeOffset;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void Shake(float duration = 0.25f, float magnitude = 0.4f)
        {
            StopAllCoroutines();
            StartCoroutine(ShakeRoutine(duration, magnitude));
        }

        private IEnumerator ShakeRoutine(float duration, float magnitude)
        {
            float elapsed = 0f;
            while (elapsed < duration)
            {
                float strength = (1f - (elapsed / duration)) * magnitude;
                shakeOffset = new Vector3(
                    Random.Range(-1f, 1f) * strength,
                    Random.Range(-0.5f, 0.5f) * strength,
                    Random.Range(-1f, 1f) * strength
                );

                elapsed += Time.unscaledDeltaTime;
                yield return null;
            }

            shakeOffset = Vector3.zero;
        }
    }
}
