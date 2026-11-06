using System.IO;
using UnityEditor;
using UnityEngine;

namespace Cyberasur.Editor
{
    public static class CyberTextureGenerator
    {
        public static Texture2D GenerateEraserSleeveTexture(bool isPlayer)
        {
            int width = 512;
            int height = 512;
            Texture2D tex = new Texture2D(width, height, TextureFormat.RGBA32, true);
            tex.wrapMode = TextureWrapMode.Clamp;

            Color primaryColor = isPlayer ? new Color(0.02f, 0.42f, 0.92f) : new Color(0.92f, 0.12f, 0.22f);
            Color accentColor = isPlayer ? new Color(0f, 0.95f, 1f) : new Color(1f, 0.65f, 0.1f);
            Color darkStripe = new Color(0.06f, 0.07f, 0.09f);
            Color whiteStripe = new Color(0.96f, 0.97f, 0.99f);

            for (int y = 0; y < height; y++)
            {
                float ny = (float)y / height;
                Color baseCol;

                if (ny > 0.64f) baseCol = primaryColor;
                else if (ny > 0.34f) baseCol = whiteStripe;
                else baseCol = darkStripe;

                for (int x = 0; x < width; x++)
                {
                    float nx = (float)x / width;
                    Color pixel = baseCol;

                    // Crisp metallic/neon separator bands
                    if (Mathf.Abs(ny - 0.64f) < 0.018f || Mathf.Abs(ny - 0.34f) < 0.018f)
                    {
                        pixel = accentColor;
                    }

                    // Diagonal hazard chevrons on enemy sleeve
                    if (!isPlayer && ny > 0.66f && ny < 0.76f)
                    {
                        if (((x + y) / 16) % 2 == 0)
                            pixel = new Color(1f, 0.78f, 0.1f);
                    }

                    // Cyber circuit grid on top stripe
                    if (ny > 0.66f && (x % 32 == 0 || y % 32 == 0))
                    {
                        pixel = Color.Lerp(pixel, accentColor, 0.4f);
                    }

                    // Stylized Bold Block Logo in center white band ("MONO" / "RX-99")
                    if (ny > 0.41f && ny < 0.57f && nx > 0.18f && nx < 0.82f)
                    {
                        int charSlot = (int)((nx - 0.18f) / 0.16f);
                        float lx = ((nx - 0.18f) % 0.16f) / 0.16f;
                        float ly = (ny - 0.41f) / 0.16f;

                        if (lx > 0.15f && lx < 0.85f)
                        {
                            bool stroke = (lx < 0.32f || lx > 0.68f || ly < 0.22f || ly > 0.78f || (charSlot % 2 == 0 && Mathf.Abs(ly - 0.5f) < 0.12f));
                            if (stroke) pixel = darkStripe;
                        }
                    }

                    // High-contrast barcode in bottom dark stripe
                    if (ny > 0.07f && ny < 0.25f && nx > 0.15f && nx < 0.85f)
                    {
                        bool bar = ((x / 5) % 2 == 0) ^ ((x / 11) % 3 == 0);
                        pixel = bar ? whiteStripe : darkStripe;
                    }

                    tex.SetPixel(x, y, pixel);
                }
            }

            tex.Apply();
            return tex;
        }

        public static Texture2D GenerateDeskGridTexture()
        {
            int size = 512;
            Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, true);

            Color deskDark = new Color(0.07f, 0.09f, 0.13f);
            Color deskMid = new Color(0.11f, 0.14f, 0.19f);
            Color neonCyan = new Color(0f, 0.8f, 1f, 1f);
            Color dangerYellow = new Color(1f, 0.72f, 0.1f, 1f);
            Color dangerRed = new Color(1f, 0.18f, 0.3f, 1f);

            for (int y = 0; y < size; y++)
            {
                float ny = (float)y / size;
                for (int x = 0; x < size; x++)
                {
                    float nx = (float)x / size;
                    float n = Mathf.PerlinNoise(x * 0.025f, y * 0.008f);
                    Color pixel = Color.Lerp(deskDark, deskMid, n);

                    // Fine tactical grid
                    if (x % 32 == 0 || y % 32 == 0)
                    {
                        pixel = Color.Lerp(pixel, neonCyan, 0.28f);
                    }
                    // Major sector lines
                    if (x % 128 == 0 || y % 128 == 0)
                    {
                        pixel = Color.Lerp(pixel, neonCyan, 0.65f);
                    }

                    // Center Battle Ring Circle
                    float dx = nx - 0.5f;
                    float dy = ny - 0.5f;
                    float distCenter = Mathf.Sqrt(dx * dx + dy * dy);
                    if (Mathf.Abs(distCenter - 0.28f) < 0.006f || Mathf.Abs(distCenter - 0.08f) < 0.005f)
                    {
                        pixel = Color.Lerp(pixel, neonCyan, 0.8f);
                    }

                    // Perimeter DANGER RING-OUT ZONE warning stripes
                    float edgeDist = Mathf.Min(Mathf.Min(nx, 1f - nx), Mathf.Min(ny, 1f - ny));
                    if (edgeDist < 0.065f)
                    {
                        bool hazardStripe = ((x + y) / 14) % 2 == 0;
                        pixel = hazardStripe ? dangerRed : new Color(0.12f, 0.04f, 0.06f);
                    }
                    else if (edgeDist < 0.075f)
                    {
                        pixel = dangerYellow;
                    }

                    tex.SetPixel(x, y, pixel);
                }
            }

            tex.Apply();
            return tex;
        }

        public static void SaveTexture(Texture2D tex, string relativePath)
        {
            byte[] bytes = tex.EncodeToPNG();
            string fullPath = Path.Combine(Application.dataPath, relativePath);
            string dir = Path.GetDirectoryName(fullPath);
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            File.WriteAllBytes(fullPath, bytes);
            AssetDatabase.Refresh();
        }
    }
}
