using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Windows.Forms;

namespace AkimLauncher
{
    internal static class Program
    {
        private static Process server;

        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            string root = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            if (!File.Exists(Path.Combine(root, "package.json")))
            {
                MessageBox.Show("Положите Akim.exe в папку проекта, рядом с package.json.", "Аким на 5 часов");
                return;
            }
            if (!Directory.Exists(Path.Combine(root, "node_modules", "next")))
            {
                MessageBox.Show("Сначала в этой папке выполните npm install.", "Аким на 5 часов");
                return;
            }

            string node = FindNode();
            if (node == null)
            {
                MessageBox.Show("Не найден Node.js. Установите Node.js LTS и запустите Akim.exe снова.", "Аким на 5 часов");
                return;
            }

            var start = new ProcessStartInfo
            {
                FileName = node,
                Arguments = "node_modules\\next\\dist\\bin\\next dev -p 4173",
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            server = Process.Start(start);

            var form = new Form
            {
                Text = "Аким на 5 часов",
                Width = 480,
                Height = 210,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                StartPosition = FormStartPosition.CenterScreen
            };
            var label = new Label
            {
                Left = 16,
                Top = 16,
                Width = 430,
                Height = 70,
                Text = "Запускаем город на http://localhost:4173\r\nЭто окно держит сервер. Закройте его, когда закончите смотр."
            };
            var open = new Button { Left = 16, Top = 110, Width = 200, Height = 32, Text = "Открыть в браузере", Enabled = false };
            var stop = new Button { Left = 230, Top = 110, Width = 200, Height = 32, Text = "Остановить и закрыть" };
            open.Click += delegate { Process.Start(new ProcessStartInfo { FileName = "http://localhost:4173", UseShellExecute = true }); };
            stop.Click += delegate { form.Close(); };
            form.Controls.Add(label);
            form.Controls.Add(open);
            form.Controls.Add(stop);
            form.FormClosing += delegate { StopServer(); };

            var timer = new Timer { Interval = 500 };
            int tries = 0;
            timer.Tick += delegate
            {
                tries++;
                if (PortOpen())
                {
                    timer.Stop();
                    label.Text = "Город открыт: http://localhost:4173\r\nБраузер можно закрыть. Сервер жив, пока открыто это окно.";
                    open.Enabled = true;
                    Process.Start(new ProcessStartInfo { FileName = "http://localhost:4173", UseShellExecute = true });
                }
                else if (tries > 80)
                {
                    timer.Stop();
                    label.Text = "Сервер не ответил. Проверьте, что порт 4173 свободен, и запустите Akim.exe ещё раз.";
                }
            };
            form.Shown += delegate { timer.Start(); };
            Application.Run(form);
        }

        private static bool PortOpen()
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var task = client.ConnectAsync("127.0.0.1", 4173);
                    return task.Wait(200) && client.Connected;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void StopServer()
        {
            try
            {
                if (server != null && !server.HasExited)
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = "/PID " + server.Id + " /T /F",
                        CreateNoWindow = true,
                        UseShellExecute = false
                    });
                }
            }
            catch
            {
            }
        }

        private static string FindNode()
        {
            string[] roots = new[]
            {
                Environment.GetEnvironmentVariable("PATH") ?? "",
            };
            foreach (string entry in roots[0].Split(';'))
            {
                string candidate = Path.Combine(entry.Trim(), "node.exe");
                if (entry.Length > 0 && File.Exists(candidate)) return candidate;
            }
            string program = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
            if (File.Exists(program)) return program;
            string local = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "node-portable");
            if (Directory.Exists(local))
            {
                foreach (string dir in Directory.GetDirectories(local))
                {
                    string candidate = Path.Combine(dir, "node.exe");
                    if (File.Exists(candidate)) return candidate;
                }
            }
            return null;
        }
    }
}
