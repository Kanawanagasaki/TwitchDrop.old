using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ru.Kanawanagasaki.TwitchDrop.Logic.Emotes
{
    public class CustomEmote : AEmote
    {
        private string _name;
        private string _space;

        public override string Uri => $"/img/{Space}/{_name}.png";
        public override string Name => _name;
        public override string Space => @$"custom{_space}";

        private const string _path = "wwwroot/img/custom";

        public CustomEmote(FileInfo file)
        {
            _name = Path.GetFileNameWithoutExtension(file.FullName);
            
            _space = file.DirectoryName;
            _space = _space.Replace('\\', '/');
            if(_space.EndsWith("custom")) _space = "";
            else
            {
                int index = _space.LastIndexOf(_path);
                if(index >= 0) _space = _space.Substring(index + _path.Length);
            }

            if(File.Exists(AnimationFile)) IsAnimation = true;
        }
    }
}
