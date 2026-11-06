using System;
using UnityEngine;

namespace Cyberasur.Core
{
    public class DeskArenaManager : MonoBehaviour
    {
        public static DeskArenaManager Instance { get; private set; }

        [Header("Spawn Positions")]
        public Vector3 playerSpawnPos = new Vector3(-4.6f, 0.7f, 0f);
        public Vector3 enemySpawnPos = new Vector3(4.6f, 0.7f, 0f);

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void ResetArenaEntities()
        {
            var pObj = GameObject.Find("Player_Eraser");
            var eObj = GameObject.Find("Enemy_Eraser");

            ResetEntity(pObj, playerSpawnPos, Quaternion.Euler(0f, 90f, 0f));
            ResetEntity(eObj, enemySpawnPos, Quaternion.Euler(0f, -90f, 0f));
        }

        private void ResetEntity(GameObject obj, Vector3 pos, Quaternion rot)
        {
            if (obj == null) return;

            var rb = obj.GetComponent<Rigidbody>();
            if (rb != null)
            {
                rb.linearVelocity = Vector3.zero;
                rb.angularVelocity = Vector3.zero;
            }

            obj.transform.position = pos;
            obj.transform.rotation = rot;

            var stats = obj.GetComponent<EraserStats>();
            if (stats != null)
            {
                stats.ApplyChassisStats(stats.chassisType);
            }

            var pCtrl = obj.GetComponent<TurnPlayerController>();
            if (pCtrl != null)
            {
                pCtrl.StopTrail();
                pCtrl.usedMidShotSkill = false;
            }
        }
    }
}
