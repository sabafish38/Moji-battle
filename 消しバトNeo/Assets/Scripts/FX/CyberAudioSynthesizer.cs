using UnityEngine;

namespace Cyberasur.FX
{
    [RequireComponent(typeof(AudioSource))]
    public class CyberAudioSynthesizer : MonoBehaviour
    {
        public static CyberAudioSynthesizer Instance { get; private set; }

        private AudioSource sfxSource;
        private AudioClip launchClip;
        private AudioClip hitLightClip;
        private AudioClip hitHeavyClip;
        private AudioClip partDetachClip;
        private AudioClip boostClip;
        private AudioClip ringOutClip;
        private AudioClip victoryClip;

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else { Destroy(gameObject); return; }

            sfxSource = GetComponent<AudioSource>();
            sfxSource.playOnAwake = false;
            sfxSource.spatialBlend = 0f;

            GenerateAllClips();
        }

        private void GenerateAllClips()
        {
            launchClip = CreateSynthClip("Launch", 0.28f, (t, norm) =>
            {
                float freq = Mathf.Lerp(180f, 820f, norm * norm);
                float noise = (Random.value * 2f - 1f) * 0.25f * (1f - norm);
                return (Mathf.Sin(t * freq * Mathf.PI * 2f) * 0.6f + noise) * (1f - norm);
            });

            hitLightClip = CreateSynthClip("HitLight", 0.16f, (t, norm) =>
            {
                float env = Mathf.Exp(-norm * 10f);
                float tone = Mathf.Sin(t * 520f * Mathf.PI * 2f) + Mathf.Sin(t * 980f * Mathf.PI * 2f) * 0.5f;
                float noise = (Random.value * 2f - 1f) * 0.4f;
                return (tone * 0.5f + noise) * env;
            });

            hitHeavyClip = CreateSynthClip("HitHeavy", 0.42f, (t, norm) =>
            {
                float env = Mathf.Exp(-norm * 6.5f);
                float sub = Mathf.Sin(t * Mathf.Lerp(160f, 45f, norm) * Mathf.PI * 2f);
                float clang = Mathf.Sin(t * 1240f * Mathf.PI * 2f) * Mathf.Exp(-norm * 14f);
                float noise = (Random.value * 2f - 1f) * 0.6f * Mathf.Exp(-norm * 8f);
                return Mathf.Clamp((sub * 0.8f + clang * 0.4f + noise * 0.5f) * env, -1f, 1f);
            });

            partDetachClip = CreateSynthClip("PartDetach", 0.35f, (t, norm) =>
            {
                float env = 1f - norm;
                float freq = (norm < 0.3f) ? 880f : 1320f;
                float metal = Mathf.Sin(t * freq * Mathf.PI * 2f) * 0.5f;
                float spark = (Random.value * 2f - 1f) * 0.5f;
                return (metal + spark) * env * env;
            });

            boostClip = CreateSynthClip("Boost", 0.32f, (t, norm) =>
            {
                float env = Mathf.Sin(norm * Mathf.PI);
                float f = Mathf.Lerp(300f, 1100f, norm);
                float saw = ((t * f) % 1f) * 2f - 1f;
                float noise = (Random.value * 2f - 1f) * 0.4f;
                return (saw * 0.4f + noise * 0.6f) * env;
            });

            ringOutClip = CreateSynthClip("RingOut", 0.65f, (t, norm) =>
            {
                float env = 1f - norm;
                float freq = Mathf.Lerp(600f, 90f, norm);
                float wave = Mathf.Sin(t * freq * Mathf.PI * 2f);
                float boom = (Random.value * 2f - 1f) * 0.5f * Mathf.Exp(-norm * 3f);
                return (wave * 0.6f + boom) * env;
            });

            victoryClip = CreateSynthClip("Victory", 0.75f, (t, norm) =>
            {
                float note = norm < 0.25f ? 523.25f : (norm < 0.5f ? 659.25f : (norm < 0.75f ? 783.99f : 1046.5f));
                float env = 1f - (norm * 0.5f);
                return Mathf.Sin(t * note * Mathf.PI * 2f) * 0.45f * env;
            });
        }

        private AudioClip CreateSynthClip(string name, float duration, System.Func<float, float, float> generator)
        {
            int sampleRate = 44100;
            int sampleCount = Mathf.CeilToInt(sampleRate * duration);
            float[] samples = new float[sampleCount];

            for (int i = 0; i < sampleCount; i++)
            {
                float t = (float)i / sampleRate;
                float norm = (float)i / sampleCount;
                samples[i] = Mathf.Clamp(generator(t, norm), -1f, 1f);
            }

            AudioClip clip = AudioClip.Create(name, sampleCount, 1, sampleRate, false);
            clip.SetData(samples, 0);
            return clip;
        }

        public void PlayLaunch() => PlayClip(launchClip, 0.75f);
        public void PlayImpact(bool heavy) => PlayClip(heavy ? hitHeavyClip : hitLightClip, heavy ? 0.95f : 0.65f);
        public void PlayPartDetach() => PlayClip(partDetachClip, 0.85f);
        public void PlayBoost() => PlayClip(boostClip, 0.8f);
        public void PlayRingOut() => PlayClip(ringOutClip, 0.95f);
        public void PlayVictory() => PlayClip(victoryClip, 0.8f);

        private void PlayClip(AudioClip clip, float volume)
        {
            if (sfxSource != null && clip != null)
            {
                sfxSource.PlayOneShot(clip, volume);
            }
        }
    }
}
