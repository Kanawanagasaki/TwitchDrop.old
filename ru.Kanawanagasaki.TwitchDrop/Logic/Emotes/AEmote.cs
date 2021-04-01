using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ru.Kanawanagasaki.TwitchDrop.Logic.Emotes
{
    public abstract class AEmote
    {
        public bool IsAnimation { get; protected set; }

        public abstract string Uri { get; }
        public abstract string Name { get; }
        public abstract string Space { get; }

        protected string ImageDirectory => @$"wwwroot/img/{Space}";
        protected string AnimationDirectory => @$"wwwroot/static/{Space}";
        protected string ImageFile => ImageDirectory + @$"/{Name}.png";
        protected string AnimationFile => AnimationDirectory + @$"/{Name}.json";

        public void CreateAnimation()
        {
            if (!Directory.Exists(ImageDirectory)) Directory.CreateDirectory(ImageDirectory);
            if (!Directory.Exists(AnimationDirectory)) Directory.CreateDirectory(AnimationDirectory);

            if (!File.Exists(ImageFile) || !File.Exists(AnimationFile))
            {
                using (HttpClient http = new HttpClient())
                {
                    var response = http.GetAsync(Uri).Result;
                    var stream = response.Content.ReadAsStreamAsync().Result;

                    using (Image img = Image.Load(stream, out var format))
                    {
                        if (format.Name.ToUpper() != "GIF") return;

                        int width = Math.Min(64, img.Width);
                        int height = img.Width > 64 ? (int)(64M * ((decimal)img.Height / (decimal)img.Width)) : img.Height;

                        int framesCount = img.Frames.Count;
                        decimal delay = 0;

                        int columns = (int)Math.Sqrt(framesCount);
                        int rows = framesCount / columns;
                        if (framesCount % columns != 0) rows++;

                        using (Image animation = new Image<Rgba32>(width * columns, height * rows))
                        {
                            animation.Mutate(a =>
                            {
                                a.Fill(Color.FromRgba(0, 0, 0, 0));

                                for (int i = 0; i < img.Frames.Count; i++)
                                {
                                    delay += img.Frames[i].Metadata.GetGifMetadata().FrameDelay;

                                    using (var frame = img.Frames.CloneFrame(i))
                                    {
                                        frame.Mutate(f => f.Resize(width, height));

                                        int x = i % columns;
                                        int y = i / columns;
                                        var point = new Point(x * width, y * height);

                                        a.DrawImage(frame, point, 1);
                                    }
                                }
                            });

                            animation.SaveAsPng(ImageFile);
                        }

                        if (delay <= 0) delay = 33;
                        int fps = (int)(100M / (delay / framesCount));
                        if (fps <= 0) fps = 1;

                        Dictionary<string, object> info = new Dictionary<string, object>();
                        info["width"] = width;
                        info["height"] = height;
                        info["framesCount"] = framesCount;
                        info["fps"] = fps;

                        File.WriteAllText(AnimationFile, JsonConvert.SerializeObject(info));
                    }
                }
            }

            IsAnimation = true;
        }

        public Dictionary<string, object> GetInfo()
        {
            var ret = GetAnimationInfo();
            ret["isAnimation"] = IsAnimation;
            ret["url"] = GetAnimationUrl();
            return ret;
        }

        public Dictionary<string, object> GetAnimationInfo()
        {
            Dictionary<string, object> ret = new Dictionary<string, object>();

            if (IsAnimation && File.Exists(AnimationFile))
            {
                string json = File.ReadAllText(AnimationFile);
                JObject obj = JsonConvert.DeserializeObject<JObject>(json);

                ret["width"] = obj.Value<int>("width");
                ret["height"] = obj.Value<int>("height");
                ret["fps"] = obj.Value<int>("fps");
                ret["framesCount"] = obj.Value<int>("framesCount");
            }

            return ret;
        }

        public string GetAnimationUrl()
        {
            if (IsAnimation && File.Exists(ImageFile))
                return ImageFile.Replace("wwwroot", "");
            else return Uri;
        }
    }
}
