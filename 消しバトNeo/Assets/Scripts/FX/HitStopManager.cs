using System.Collections;
using UnityEngine;

namespace Cyberasur.FX
{
    public class HitStopManager : MonoBehaviour
    {
        public static HitStopManager Instance { get; private set; }

        private bool isStopping = false;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void TriggerHitStop(float duration = 0.08f, float slowScale = 0.05f)
        {
            if (isStopping) return;
            StartCoroutine(HitStopRoutine(duration, slowScale));
        }

        private IEnumerator HitStopRoutine(float duration, float slowScale)
        {
            isStopping = true;
            Time.timeScale = slowScale;
            yield return new WaitForSecondsRealtime(duration);
            Time.timeScale = 1f;
            isStopping = false;
        }

        private void OnDisable()
        {
            Time.timeScale = 1f;
        }
    }
}
