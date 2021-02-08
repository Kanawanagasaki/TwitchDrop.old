using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ru.Kanawanagasaki.TwitchDrop.Pages
{
    public class IndexModel : PageModel
    {
        public string Channel { get; set; } = null;
        public string Volume { get; set; }

        private readonly ILogger<IndexModel> _logger;

        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        public void OnGet(string channel, int volume = 25)
        {
            Channel = channel;

            if (volume < 0) volume = 0;
            if (volume > 100) volume = 100;

            Volume = $"{volume / 100f}".Replace(',', '.');
        }
    }
}
