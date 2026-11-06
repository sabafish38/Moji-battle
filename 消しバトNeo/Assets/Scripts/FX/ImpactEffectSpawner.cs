using System.Collections;
using UnityEngine;

namespace Cyberasur.FX
{
    public class ImpactEffectSpawner : MonoBehaviour
    {
        public static ImpactEffectSpawner Instance { get; private set; }

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
        }

        public void SpawnSparks(Vector3 hitPosition, Vector3 hitNormal, float impactSpeed)
        {
            bool isHeavy = impactSpeed >= 12f;

            // Play synthesized SFX
            if (CyberAudioSynthesizer.Instance != null)
            {
                CyberAudioSynthesizer.Instance.PlayImpact(isHeavy);
            }

            // 1. Particle burst
            GameObject sparkObj = new GameObject("ClashSpark_FX");
            sparkObj.transform.position = hitPosition + Vector3.up * 0.2f;
            if (hitNormal.sqrMagnitude > 0.001f)
            {
                sparkObj.transform.forward = hitNormal;
            }

            var ps = sparkObj.AddComponent<ParticleSystem>();
            var psr = sparkObj.GetComponent<ParticleSystemRenderer>();

            var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (shader == null) shader = Shader.Find("Particles/Standard Unlit");
            if (shader != null)
            {
                var mat = new Material(shader);
                Color sparkCol = isHeavy ? new Color(1f, 0.45f, 0.1f, 1f) : new Color(0.2f, 0.9f, 1f, 1f);
                mat.SetColor("_BaseColor", sparkCol);
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", sparkCol * 4f);
                psr.material = mat;
            }

            var main = ps.main;
            main.startLifetime = isHeavy ? 0.55f : 0.35f;
            main.startSpeed = Mathf.Clamp(impactSpeed * 1.1f, 6f, 28f);
            main.startSize = isHeavy ? 0.22f : 0.14f;
            main.startColor = new ParticleSystem.MinMaxGradient(
                new Color(1f, 0.95f, 0.4f),
                isHeavy ? new Color(1f, 0.2f, 0.5f) : new Color(0.1f, 0.85f, 1f)
            );
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.stopAction = ParticleSystemStopAction.Destroy;
            main.gravityModifier = 0.8f;

            var emission = ps.emission;
            emission.rateOverTime = 0;
            int sparkCount = (int)Mathf.Clamp(impactSpeed * 4f, 20f, 80f);
            emission.SetBursts(new ParticleSystem.Burst[] { new ParticleSystem.Burst(0f, (short)sparkCount) });

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.2f;

            ps.Play();
            Destroy(sparkObj, 1.5f);

            // 2. Expanding Shockwave Ring on heavy hits
            if (isHeavy)
            {
                StartCoroutine(SpawnShockwaveRingRoutine(hitPosition, impactSpeed));
            }
        }

        public void SpawnBoostBurst(Vector3 pos, Vector3 dir, Color color)
        {
            if (CyberAudioSynthesizer.Instance != null)
            {
                CyberAudioSynthesizer.Instance.PlayBoost();
            }
            StartCoroutine(SpawnShockwaveRingRoutine(pos, 14f, color));
        }

        private IEnumerator SpawnShockwaveRingRoutine(Vector3 center, float power, Color? customColor = null)
        {
            GameObject ringObj = new GameObject("ShockwaveRing_FX");
            var lr = ringObj.AddComponent<LineRenderer>();
            int segments = 36;
            lr.positionCount = segments + 1;
            lr.useWorldSpace = true;
            lr.startWidth = 0.25f;
            lr.endWidth = 0.25f;

            var shader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (shader == null) shader = Shader.Find("Sprites/Default");
            Color ringColor = customColor ?? new Color(1f, 0.75f, 0.2f, 0.95f);

            if (shader != null)
            {
                var mat = new Material(shader);
                mat.SetColor("_BaseColor", ringColor);
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", ringColor * 3.5f);
                lr.material = mat;
            }

            float duration = 0.32f;
            float elapsed = 0f;
            float maxRadius = Mathf.Clamp(power * 0.22f, 2.0f, 4.8f);
            Vector3 basePos = new Vector3(center.x, 0.08f, center.z);

            while (elapsed < duration)
            {
                elapsed += Time.unscaledDeltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float radius = Mathf.Lerp(0.3f, maxRadius, 1f - Mathf.Pow(1f - t, 3f));
                float width = Mathf.Lerp(0.28f, 0.01f, t);

                if (lr != null)
                {
                    lr.startWidth = width;
                    lr.endWidth = width;

                    for (int i = 0; i <= segments; i++)
                    {
                        float angle = (float)i / segments * Mathf.PI * 2f;
                        Vector3 pt = basePos + new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);
                        lr.SetPosition(i, pt);
                    }
                }
                yield return null;
            }

            if (ringObj != null) Destroy(ringObj);
        }
    }
}
