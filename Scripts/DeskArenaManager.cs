using System;
using UnityEngine;

namespace Cyberasur.Core
{
    public class DeskArenaManager : MonoBehaviour
    {
        public static DeskArenaManager Instance { get; private set; }

        [Header("Arena Bounds")]
        [SerializeField] private float fallThresholdY = -2f;
        [SerializeField] private Transform[] spawnPoints;

        [Header("Events")]
        public event Action<GameObject> OnPlayerRingOut;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        private void Update()
        {
            CheckRingOut();
        }

        private void CheckRingOut()
        {
            PlayerEraserController[] players = FindObjectsByType<PlayerEraserController>(FindObjectsSortMode.None);
            foreach (var player in players)
            {
                if (player.transform.position.y < fallThresholdY)
                {
                    HandleRingOut(player.gameObject);
                }
            }
        }

        private void HandleRingOut(GameObject fallenObj)
        {
            Debug.Log($"[CYBERASUR] RING OUT: {fallenObj.name} fell into the Cyber Abyss!");
            OnPlayerRingOut?.Invoke(fallenObj);

            // Temporarily disable physics and respawn at spawn point for prototype testing
            Rigidbody rb = fallenObj.GetComponent<Rigidbody>();
            if (rb != null)
            {
                rb.linearVelocity = Vector3.zero;
                rb.angularVelocity = Vector3.zero;
            }

            if (spawnPoints != null && spawnPoints.Length > 0)
            {
                fallenObj.transform.position = spawnPoints[0].position;
                fallenObj.transform.rotation = spawnPoints[0].rotation;
            }
            else
            {
                fallenObj.transform.position = new Vector3(0f, 1f, 0f);
            }
        }
    }
}
