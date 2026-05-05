import { GlassCard } from "../components/GlassCard.tsx";
import { Play, Square, CheckCircle, ExternalLink, MessageCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";

export function ProgressView({ pendingFiles }: { pendingFiles: any[] }) {
  const [status, setStatus] = useState<any>({ status: 'idle' });
  const [sendLimit, setSendLimit] = useState(16);
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/copy/status");
      const data = await res.json();
      setStatus(data);
      setNow(Date.now());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      fetchStatus();
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startProcess = async () => {
    setIsStarting(true);
    try {
      await fetch("/api/copy/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          files: pendingFiles.slice(0, sendLimit),
          settings: { sendLimit }
        })
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  const stopProcess = async () => {
    await fetch("/api/copy/stop", { method: "POST" });
  };

  const openWhatsApp = () => {
    if (!status.copiedNames || status.copiedNames.length === 0) return;
    const dateStr = new Date().toLocaleString('pt-BR');
    const message = `Estão feitos (${dateStr}):\n${status.copiedNames.join('\n')}`;
    const url = `whatsapp://send?phone=558198651733&text=${encodeURIComponent(message)}`;
    window.location.href = url;
  };

  const isRunning = status.status === 'running';
  const isFinished = status.status === 'finished';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Execução</h1>
        <p className="text-gray-400">Controle o processo de cópia e agendamento.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1 h-fit">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Configuração de Lote
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Limite para este envio</label>
              <input
                type="number"
                disabled={isRunning}
                value={sendLimit}
                onChange={(e) => setSendLimit(parseInt(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-fluent-accent disabled:opacity-50"
              />
              <p className="text-[10px] text-gray-500 mt-2 italic">Dica: O padrão recomendado é 17 arquivos.</p>
            </div>

            {isRunning ? (
              <button
                onClick={stopProcess}
                className="w-full py-3 rounded-lg bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <Square className="w-4 h-4 fill-current" />
                Interromper Processo
              </button>
            ) : (
              <button
                disabled={pendingFiles.length === 0 || isStarting}
                onClick={startProcess}
                className="w-full py-3 rounded-lg bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-all flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />}
                Iniciar Sincronização
              </button>
            )}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Status do Processo
            {isRunning && <span className="flex h-2 w-2 relative ml-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>}
          </h3>

          {!isRunning && !isFinished ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-4">
              <AlertCircle className="w-12 h-12 opacity-20" />
              <p>Aguardando início do processo...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">{isFinished ? "Concluído" : "Processando..."}</span>
                  <span className="font-bold">{status.progress}%</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-fluent-accent shadow-[0_0_15px_#0078d4]"
                    initial={{ width: 0 }}
                    animate={{ width: `${status.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Copiados</p>
                   <p className="text-2xl font-bold text-green-400">{status.copied}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Falhas</p>
                   <p className="text-2xl font-bold text-red-400">{status.failed}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Total Lote</p>
                   <p className="text-2xl font-bold text-blue-400">{status.total}</p>
                </div>
              </div>

              {isFinished && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
                >
                   <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                   <h4 className="text-lg font-bold mb-2">Processo Finalizado com Sucesso!</h4>
                   <p className="text-sm text-gray-400 mb-6">Todos os arquivos do lote foram processados. Você pode agora enviar o resumo via WhatsApp.</p>
                   <button 
                     onClick={openWhatsApp}
                     className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mx-auto font-semibold"
                   >
                     <MessageCircle className="w-5 h-5" />
                     Enviar para WhatsApp
                   </button>
                </motion.div>
              )}

              {isRunning && (
                <div className="space-y-4">
                  {status.currentFileWaiting && status.nextCopyAt > now && (
                    <div className="flex items-center gap-4 bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">Aguardando Janela de Tempo</p>
                        <p className="text-sm font-medium">
                          Próximo arquivo: <span className="text-white">{status.currentFileWaiting}</span>
                        </p>
                      </div>
                      <div className="text-xl font-bold font-mono text-orange-400">
                        {Math.floor(Math.max(0, status.nextCopyAt - now) / 60000).toString().padStart(2, '0')}:
                        {Math.floor((Math.max(0, status.nextCopyAt - now) % 60000) / 1000).toString().padStart(2, '0')}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h5 className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Atividade em Tempo Real:</h5>
                    <div className="h-40 bg-black/30 rounded-lg border border-white/5 p-4 font-mono text-[11px] overflow-y-auto space-y-1 scrollbar-hide">
                      <div className="text-blue-400 opacity-50 flex gap-2">
                         <span>[{new Date().toLocaleTimeString()}]</span>
                         <span>Iniciando sincronização do lote...</span>
                      </div>
                      {status.copiedNames?.map((name: string, i: number) => (
                        <div key={i} className="flex gap-2 text-green-500/80">
                          <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span>
                          <span className="font-semibold">OK:</span>
                          <span>{name} sincronizado com sucesso.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
