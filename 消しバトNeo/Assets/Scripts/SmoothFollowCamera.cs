using UnityEngine;
using Cyberasur.FX;

namespace Cyberasur.Core
{
    public class SmoothFollowCamera : MonoBehaviour
    {
        [Header("Behind-Player Stage Overhead View (自機後方からのステージ俯瞰固定視点)")]
        // ゲーム開始時の自機 (-X側) の後ろから、前方の敵 (+X側) と机全体を上から見渡す俯瞰アングル
        [SerializeField] private Vector3 fixedCameraPosition = new Vector3(-13.2f, 10.8f, 0f);
        [SerializeField] private Vector3 fixedCameraRotationEuler = new Vector3(40f, 90f, 0f);

        private void Start()
        {
            ApplyFixedOverheadView();
        }

        public void ApplyFixedOverheadView()
        {
            transform.position = fixedCameraPosition;
            transform.rotation = Quaternion.Euler(fixedCameraRotationEuler);
        }

        private void LateUpdate()
        {
            // ゲーム開始時の自機後方からの俯瞰アングルに完全固定！
            // 激突時の迫力ある画面シェイクのみ反映
            Vector3 shake = CameraShaker.Instance != null ? CameraShaker.Instance.ShakeOffset : Vector3.zero;

            transform.position = fixedCameraPosition + shake;
            transform.rotation = Quaternion.Euler(fixedCameraRotationEuler);
        }

        public void SetTarget(Transform newTarget)
        {
        }

        public void SnapToPlayerView()
        {
            ApplyFixedOverheadView();
        }
    }
}
