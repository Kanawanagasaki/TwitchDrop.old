using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public class ServerSideEventWebClient : WebClient
    {
        private HttpResponse _response;
        private CancellationToken _requestAborted;

        private uint? _lastId;

        public ServerSideEventWebClient(HttpContext context, string channel, uint? lastId = null) : base(context)
        {
            _response = context.Response;
            _requestAborted = context.RequestAborted;
            ChannelName = channel;
            _lastId = lastId;
        }

        public override Task<string> ReadChannel()
        {
            return Task.FromResult<string>(ChannelName);
        }

        public override uint? GetLastEventId()
        {
            if(_lastId.HasValue) return _lastId;
            if(Context.Request.Headers.ContainsKey("Last-Event-ID") &&
                uint.TryParse(Context.Request.Headers["Last-Event-ID"].ToString(), out var res))
                    return res;
            return base.GetLastEventId();
        }

        public override async Task Init()
        {
            await _response.WriteAsync($"retry: 2500\n\n");
            await _response.Body.FlushAsync();
        }

        protected override void OnTick()
        {
            if(_requestAborted.IsCancellationRequested)
            {
                Close();
            }
        }

        protected override async Task SendMessageAsync(uint? id, string message)
        {
            await _response.WriteAsync($"data: {message}\n\n");
            if(id.HasValue)
            {
                Sessions[SessionUid] = id.Value;
                await _response.WriteAsync($"data: info id {id}\nid: {id}\n\n");
            }
            await _response.Body.FlushAsync();
        }

        public override void Close()
        {
            IsConnected = false;
            OnClose();
        }
    }
}