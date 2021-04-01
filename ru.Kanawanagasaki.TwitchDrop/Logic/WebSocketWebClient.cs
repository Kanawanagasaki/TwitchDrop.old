using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public class WebSocketWebClient : WebClient
    {
        private WebSocket _socket = null;
        private byte[] _buffer = new byte[1024 * 4];

        private List<Func<Task>> _actions = new List<Func<Task>>();
        private Thread _thread;

        public WebSocketWebClient(HttpContext context, WebSocket socket) : base(context)
        {
            _socket = socket;
        }

        public override Task Init()
        {
            return Task.CompletedTask;
        }

        public override async Task Run()
        {
            _thread = new Thread(async ()=>
            {
                while (IsConnected)
                {
                    if (_socket.CloseStatus.HasValue || _socket.State == WebSocketState.Aborted)
                    {
                        Close();
                    }
                    else
                    {
                        try
                        {
                            string packet = await ReadPacket();

                            string[] split = packet.Split(' ');
                            if (split.Length > 1 && split[0] == "info")
                            {
                                OnInfo(split[1], split.Skip(2).ToArray());
                            }
                            if (split.Length > 2 && split[0] == "id" && uint.TryParse(split[1], out var id))
                            {
                                Sessions[SessionUid] = id;
                            }
                            else if (split.Length > 2 && split[0] == "error")
                            {
                                int code = -1;
                                int.TryParse(split[2], out code);
                                OnError(split[1], code, string.Join(" ", split.Skip(3)));
                            }
                        }
                        catch
                        {
                            Close();
                        }
                    }
                }
            });
            _thread.Start();
            await base.Run();
            _thread.Join();
        }

        public override async Task<string> ReadChannel()
        {
            if(string.IsNullOrEmpty(ChannelName))
                ChannelName = await ReadPacket();
            return ChannelName;
        }

        private async Task<string> ReadPacket()
        {
            string packet = "";
            WebSocketReceiveResult result = await _socket.ReceiveAsync(new ArraySegment<byte>(_buffer), CancellationToken.None);
            while (!result.CloseStatus.HasValue)
            {
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    string part = Encoding.UTF8.GetString(_buffer, 0, result.Count);
                    packet += part;
                }

                if (!result.EndOfMessage) result = await _socket.ReceiveAsync(new ArraySegment<byte>(_buffer), CancellationToken.None);
                else break;
            }

            if (result.CloseStatus.HasValue)
                Close();

            return packet;
        }

        protected override async Task SendMessageAsync(uint? id, string message)
        {
            if (!this.IsConnected) return;
            if (_socket.CloseStatus.HasValue)
                Close();
            else
            {
                var bytes = Encoding.UTF8.GetBytes(message);
                await _socket.SendAsync(new ArraySegment<byte>(bytes, 0, bytes.Length), WebSocketMessageType.Text, true, CancellationToken.None);

                if(id.HasValue)
                {
                    string idInfo = $"info id {id}";
                    bytes = Encoding.UTF8.GetBytes(idInfo);
                    await _socket.SendAsync(new ArraySegment<byte>(bytes, 0, bytes.Length), WebSocketMessageType.Text, true, CancellationToken.None);
                }
            }
        }

        public override void Close()
        {
            IsConnected = false;
            OnClose();
        }
    }
}