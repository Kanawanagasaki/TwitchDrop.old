using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ru.Kanawanagasaki.TwitchDrop.Logic;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;

namespace ru.Kanawanagasaki.TwitchDrop
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddRazorPages();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
                app.UseHsts();
            }

            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            });

            app.UseStaticFiles();
            app.UseRouting();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapRazorPages();
            });

            var webSocketOptions = new WebSocketOptions()
            {
                KeepAliveInterval = TimeSpan.FromSeconds(120)
            };
            app.UseWebSockets(webSocketOptions);
            app.Use(async (context, next) =>
            {
                var path = context.Request.Path.ToString();
                while(path.StartsWith('/')) path = path.Substring(1);
                var split = path.Split('/');
                if (path.StartsWith("ws"))
                {
                    if (context.WebSockets.IsWebSocketRequest)
                    {
                        var socket = await context.WebSockets.AcceptWebSocketAsync();
                        var client = new WebSocketWebClient(context, socket);
                        await Hub.ProcessWebClient(client);
                    }
                    else context.Response.StatusCode = 400;
                }
                else if(split.Length > 1 && split[0] == "sse")
                {
                    context.Response.Headers.Add("Content-Type", "text/event-stream; charset=utf-8");
                    context.Response.Headers.Add("Cache-Control", "no-cache");
                    context.Response.Headers.Add("X-Accel-Buffering", "no");

                    uint? id = null;
                    if(split.Length > 2 && uint.TryParse(split[2], out var res)) id = res;
                    
                    var client = new ServerSideEventWebClient(context, split[1], id);
                    await context.Response.Body.FlushAsync();
                    await Hub.ProcessWebClient(client);
                }
                else await next?.Invoke();
            });
        }
    }
}
