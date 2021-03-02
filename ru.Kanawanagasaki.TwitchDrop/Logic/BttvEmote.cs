using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Drawing;
using System.Drawing.Imaging;
using System.Net.Http;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public class BttvEmote
    {
        public string Id { get; set; }
        public string Code { get; set; }
        public string ImageType { get; set; }

        public string Uri => $"https://cdn.betterttv.net/emote/{Id}/3x";

        private bool _isAnimation = false;
        public bool IsAnimation => _isAnimation;

        public BttvEmote() { }

        public BttvEmote(JObject jObj)
        {
            Id = jObj.Value<string>("id");
            Code = jObj.Value<string>("code");
            ImageType = jObj.Value<string>("imageType");
        }

        public void CreateAnimation()
        {
            if (ImageType != "gif") return;

            if(!File.Exists(@$"wwwroot/img/bttvanimations/{Id}.png") || !File.Exists(@$"wwwroot/static/bttvanimations/{Id}.json"))
            {
                if(!Directory.Exists(@$"wwwroot/img/bttvanimations"))
                    Directory.CreateDirectory(@$"wwwroot/img/bttvanimations");
                if (!Directory.Exists(@$"wwwroot/static/bttvanimations"))
                    Directory.CreateDirectory(@$"wwwroot/static/bttvanimations");

                using (HttpClient http = new HttpClient())
                {
                    var response = http.GetAsync(Uri).Result;
                    var stream = response.Content.ReadAsStreamAsync().Result;
                    using (Image img = Image.FromStream(stream))
                    {
                        int width = Math.Min(64, img.Width);
                        int height = img.Width > 64 ? (int)(64M * ((decimal)img.Height / (decimal)img.Width)) : img.Height;

                        int framesCount = img.GetFrameCount(FrameDimension.Time);

                        PropertyItem item = img.GetPropertyItem(0x5100);
                        decimal delay = (item.Value[0] + item.Value[1] * 256) * 10;
                        if (delay <= 0) delay = 33;

                        int fps = (int)(1000M / delay);
                        if (fps <= 0) fps = 1;

                        int columns = (int)Math.Sqrt(framesCount);
                        int rows = framesCount / columns;
                        if (framesCount % columns != 0) rows++;

                        Image animation = new Bitmap(width * columns, height * rows, PixelFormat.Format32bppArgb);
                        Graphics g = Graphics.FromImage(animation);

                        g.Clear(Color.FromArgb(0, 0, 0, 0));

                        for (int i = 0; i < framesCount; i++)
                        {
                            img.SelectActiveFrame(FrameDimension.Time, i);

                            int x = i % columns;
                            int y = i / columns;

                            g.DrawImage(img, x * width, y * height, width, height);
                        }

                        using (MemoryStream memory = new MemoryStream())
                        using (FileStream fs = new FileStream(@$"wwwroot/img/bttvanimations/{Id}.png", FileMode.Create, FileAccess.ReadWrite))
                        {
                            animation.Save(memory, ImageFormat.Png);
                            byte[] bytes = memory.ToArray();
                            fs.Write(bytes, 0, bytes.Length);
                        }

                        Dictionary<string, object> info = new Dictionary<string, object>();
                        info["width"] = width;
                        info["height"] = height;
                        info["framesCount"] = framesCount;
                        info["fps"] = fps;

                        File.WriteAllText(@$"wwwroot/static/bttvanimations/{Id}.json", JsonConvert.SerializeObject(info));

                        g.Dispose();
                        animation.Dispose();
                    }
                }
            }

            _isAnimation = true;
        }

        public Dictionary<string, object> GetAnimationInfo()
        {
            if (_isAnimation && File.Exists(@$"wwwroot/static/bttvanimations/{Id}.json"))
            {
                string json = File.ReadAllText(@$"wwwroot/static/bttvanimations/{Id}.json");
                JObject obj = JsonConvert.DeserializeObject<JObject>(json);

                int width = obj.Value<int>("width");
                int height = obj.Value<int>("height");
                int framesCount = obj.Value<int>("framesCount");
                int fps = obj.Value<int>("fps");

                Dictionary<string, object> ret = new Dictionary<string, object>();
                ret["width"] = width;
                ret["height"] = height;
                ret["fps"] = fps;
                ret["framesCount"] = framesCount;

                return ret;
            }
            else return new Dictionary<string, object>();
        }

        public string GetAnimationUrl()
        {
            if (_isAnimation && File.Exists(@$"wwwroot/img/bttvanimations/{Id}.png"))
                return $"/img/bttvanimations/{Id}.png";
            else return Uri;
        }

        public override string ToString()
        {
            return $"{Id} - {Code}.{ImageType}";
        }
    }
}
