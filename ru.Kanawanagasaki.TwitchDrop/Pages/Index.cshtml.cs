using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ru.Kanawanagasaki.TwitchDrop.Pages
{
    public class IndexModel : PageModel
    {
        public string Channel { get; set; } = "";
        public string ConnectionType { get; set; } = "true";
        public string Volume { get; set; } = "0.25";
        public string Quality { get; set; } = "8";
        public string HideCooldown { get; set; } = "90000";

        private readonly ILogger<IndexModel> _logger;

        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        public void OnGet(string channel, string connectionType = "sse", int volume = 25, int quality = 8, int cooldown = 90_000)
        {
            Channel = channel;
            ConnectionType = connectionType;

            if (volume < 0) volume = 0;
            if (volume > 100) volume = 100;

            Volume = $"{volume / 100f}".Replace(',', '.');

            if (quality < 0) quality = 0;
            if (quality > 16) quality = 16;

            Quality = $"{quality}";

            if (cooldown < 60_000) cooldown = 60_000;
            if (cooldown > 60 * 60 * 1000) cooldown = 60 * 60 * 1000;

            HideCooldown = $"{cooldown}";
        }

        public string RenderImages(Folder f)
        {
            string ret = "";

            bool isFirst = true;
            for (int i = 0; i < f.Files.Count; i++)
            {
                var file = f.Files[i];
                ret += $"{(isFirst ? "" : ",\n")}\"{i}\":\"{file}\"";
                if (isFirst) isFirst = false;
            }
            foreach (var folder in f.Childs)
            {
                ret += $"{(isFirst ? "" : ",\n")}\"{folder.Name}\":\n" + "{\n";
                ret += RenderImages(folder);
                ret += "\n}";

                if (isFirst) isFirst = false;
            }

            return ret;
        }

        public Folder GetImages(string dir)
        {
            Folder ret = new Folder();
            ret.Files = new List<string>();
            ret.Childs = new List<Folder>();
            ret.Name = dir;

            int slashIndex = ret.Name.Replace("\\", "/").IndexOf('/');
            while(slashIndex >= 0)
            {
                ret.Name = ret.Name.Substring(slashIndex+1);
                slashIndex = ret.Name.Replace("\\", "/").IndexOf('/');
            }

            string directory = "wwwroot/img" + dir;
            var files = Directory.GetFiles(directory);

            foreach(var file in files)
            {
                int index = file.IndexOf(directory);
                ret.Files.Add(file.Substring(index + directory.Length + 1));
            }

            var directories = Directory.GetDirectories(directory);
            foreach(var folder in directories)
            {
                int index = folder.IndexOf(directory);
                ret.Childs.Add(GetImages(dir + folder.Substring(index + directory.Length)));
            }

            return ret;
        }

        public string GetAnimations()
        {
            return System.IO.File.ReadAllText("wwwroot/static/spriteanimations.json");
        }
    }

    public struct Folder
    {
        public string Name;
        public List<Folder> Childs;
        public List<string> Files;
    }
}
