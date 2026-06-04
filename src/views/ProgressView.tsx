import { GlassCard } from '../components/GlassCard.tsx';
import {
  Play,
  Square,
  CheckCircle,
  MessageCircle,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  Activity,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';

type CopyOrder = 'newest' | 'oldest';

function getFileModifiedAt(file: any) {
  return (
    Number(file?.modifiedAtMs ?? file?.syncStatus?.sourceModifiedAtMs ?? 0) || 0
  );
}

function formatLogTime(value: any) {
  if (!value) return '--:--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString();
}

export function ProgressView({ pendingFiles }: { pendingFiles: any[] }) {
  const [status, setStatus] = useState<any>({ status: 'idle' });
  const [sendLimit, setSendLimit] = useState<number>(() => {
    const saved = localStorage.getItem('sendLimit');
    return saved ? parseInt(saved, 10) || 17 : 17;
  });
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [selectedMode, setSelectedMode] = useState<
    'scheduled' | 'immediate' | 'watch'
  >('scheduled');
  const [copyOrder, setCopyOrder] = useState<CopyOrder>('newest');
  const [startHour, setStartHour] = useState(14);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(17);
  const [endMinute, setEndMinute] = useState(30);
  const [watchBatchEnabled, setWatchBatchEnabled] = useState<boolean>(() => {
    return localStorage.getItem('watchBatchEnabled') === 'true';
  });
  const [watchBatchLimit, setWatchBatchLimit] = useState<number>(() => {
    const saved = localStorage.getItem('watchBatchLimit');
    return saved ? parseInt(saved, 10) || 12 : 12;
  });

  const orderedPendingFiles = useMemo(() => {
    return [...pendingFiles].sort((a, b) => {
      const diff = getFileModifiedAt(a) - getFileModifiedAt(b);
      return copyOrder === 'newest' ? -diff : diff;
    });
  }, [pendingFiles, copyOrder]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/copy/status');
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

  const startScheduled = async () => {
    setIsStarting(true);
    try {
      await fetch('/api/copy/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: orderedPendingFiles.slice(0, sendLimit),
          settings: {
            sendLimit,
            copyOrder,
            startHour,
            startMinute,
            endHour,
            endMinute,
          },
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  const startImmediate = async () => {
    if (
      !window.confirm(
        `Tem certeza que deseja copiar IMEDIATAMENTE todos os ${pendingFiles.length} arquivos pendentes?`,
      )
    ) {
      return;
    }
    setIsStarting(true);
    try {
      await fetch('/api/copy/sync-immediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: orderedPendingFiles,
          settings: {
            copyOrder,
            startHour,
            startMinute,
            endHour,
            endMinute,
          },
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  const startWatch = async () => {
    setIsStarting(true);
    try {
      await fetch('/api/copy/watch-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            copyOrder,
            startHour,
            startMinute,
            endHour,
            endMinute,
            watchBatchEnabled,
            watchBatchLimit,
          },
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  };

  const startProcess = () => {
    if (selectedMode === 'scheduled') startScheduled();
    else if (selectedMode === 'immediate') startImmediate();
    else if (selectedMode === 'watch') startWatch();
  };

  const stopProcess = async () => {
    if (!window.confirm("Tem certeza que deseja interromper o processo atual? O relatório de itens copiados nesta sessão será descartado.")) {
      return;
    }
    await fetch('/api/copy/stop', { method: 'POST' });
  };

  const finalizeProcess = async () => {
    await fetch('/api/copy/finalize', { method: 'POST' });
  };

  const openWhatsApp = () => {
    if (!status.copiedNames || status.copiedNames.length === 0) return;
    const message = `Estão feitos:\n${status.copiedNames.join('\n')}`;
    const url = `whatsapp://send?phone=558198651733&text=${encodeURIComponent(message)}`;
    window.location.href = url;
  };

  const isRunning = status.status === 'running';
  const isFinished = status.status === 'finished';
  const currentMode = status.mode || selectedMode;
  const copiedLog =
    status.copiedLog ||
    status.copiedNames?.map((name: string) => ({
      name,
      copiedAt: status.startTime,
    })) ||
    [];

  return (
    <div className="space-y-8 animate-fade-in relative z-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Sincronização &amp; Progresso
        </h1>
        <p className="text-zinc-400 text-xs md:text-sm font-semibold tracking-wide">
          Selecione o cronômetro ou modalidade ideal para cópia dos arquivos de miniaturas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <GlassCard className="lg:col-span-1 h-fit shadow-2xl">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2 select-none">
            Modalidade de Envio
          </h3>
          <div className="space-y-6">
            <div className="flex bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl gap-1 select-none backdrop-blur-md">
              <button
                disabled={isRunning}
                onClick={() => setSelectedMode('scheduled')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${selectedMode === 'scheduled' ? 'bg-[#0a84ff] text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'} disabled:opacity-50`}
              >
                <Clock className="w-3.5 h-3.5" />
                Lote
              </button>
              <button
                disabled={isRunning}
                onClick={() => setSelectedMode('immediate')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${selectedMode === 'immediate' ? 'bg-[#0a84ff] text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'} disabled:opacity-50`}
              >
                <Zap className="w-3.5 h-3.5" />
                Imediata
              </button>
              <button
                disabled={isRunning}
                onClick={() => setSelectedMode('watch')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${selectedMode === 'watch' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'} disabled:opacity-50`}
              >
                <Activity className="w-3.5 h-3.5" />
                Standby
              </button>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">
                Ordem
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 select-none">
                <button
                  disabled={isRunning}
                  onClick={() => setCopyOrder('newest')}
                  className={`min-h-10 rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${copyOrder === 'newest' ? 'bg-[#0a84ff] text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'} disabled:opacity-50`}
                >
                  <ArrowDownWideNarrow className="w-4 h-4" />
                  Mais recente
                </button>
                <button
                  disabled={isRunning}
                  onClick={() => setCopyOrder('oldest')}
                  className={`min-h-10 rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${copyOrder === 'oldest' ? 'bg-[#0a84ff] text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'} disabled:opacity-50`}
                >
                  <ArrowUpWideNarrow className="w-4 h-4" />
                  Mais antigo
                </button>
              </div>
            </div>

            <div className="min-h-[90px]">
              {selectedMode === 'scheduled' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">
                      Limite para este envio (Lote)
                    </label>
                    <input
                      type="number"
                      disabled={isRunning}
                      value={sendLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const newVal = Number.isNaN(val) ? 0 : val;
                        setSendLimit(newVal);
                        localStorage.setItem('sendLimit', newVal.toString());
                      }}
                      className="w-full glass-input"
                    />
                  </div>
                </motion.div>
              )}
              {selectedMode === 'immediate' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-[#0a84ff]/5 border border-[#0a84ff]/10">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Copia{' '}
                    <span className="font-extrabold text-[#0a84ff]">
                      {pendingFiles.length}
                    </span>{' '}
                    arquivos pendentes de uma só vez, sem atrasos.
                  </p>
                  <p className="text-[10px] text-amber-500 mt-2 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Uma confirmação será pedida.
                  </p>
                </motion.div>
              )}
              {selectedMode === 'watch' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-4">
                  <p className="text-xs text-zinc-305 leading-relaxed">
                    A pasta de origem será monitorada continuamente. Novos
                    arquivos serão adicionados à fila e a divisão de tempo será
                    recalculada conforme o horário configurado.
                  </p>
                  <p className="text-[10px] text-purple-400 mt-2 font-bold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    Sincronização standby com cálculo de divisão de tempo.
                  </p>

                  <div className="pt-4 mt-4 border-t border-purple-500/10 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-xs font-bold text-zinc-300">Modo Lote (Limite)</label>
                        <p className="text-[10px] text-zinc-500 max-w-sm leading-normal">Habilitar limite máximo de arquivos na fila de Standby.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const val = !watchBatchEnabled;
                          setWatchBatchEnabled(val);
                          localStorage.setItem('watchBatchEnabled', val ? 'true' : 'false');
                        }}
                        id="btn-toggle-watch-batch"
                        disabled={isRunning}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${watchBatchEnabled ? 'bg-purple-600' : 'bg-white/10'} disabled:opacity-50`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-250 ease-in-out ${watchBatchEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {watchBatchEnabled && (
                      <div className="space-y-2 pt-2 border-t border-purple-500/10 animate-fade-in text-left">
                        <label className="block text-xs font-semibold text-zinc-400">
                          Quantidade de arquivos limite no lote
                        </label>
                        <input
                          type="number"
                          disabled={isRunning}
                          value={watchBatchLimit}
                          min="1"
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const newVal = Number.isNaN(val) ? 1 : Math.max(1, val);
                            setWatchBatchLimit(newVal);
                            localStorage.setItem('watchBatchLimit', newVal.toString());
                          }}
                          className="w-full glass-input"
                        />
                        <p className="text-[10px] text-zinc-500 font-semibold italic leading-normal">
                          Se um novo arquivo aparecer e a fila tiver {watchBatchLimit} itens, o mais antigo será empurrado para fora do lote.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">
                    Início
                  </label>
                  <div className="flex bg-white/[0.02] border border-white/[0.08] rounded-xl focus-within:border-[#0a84ff] overflow-hidden transition-all">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      disabled={isRunning}
                      value={startHour}
                      onChange={(e) =>
                        setStartHour(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2.5 text-center text-sm font-bold text-white focus:outline-none appearance-none font-mono"
                    />
                    <span className="py-2.5 text-zinc-600 font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      disabled={isRunning}
                      value={startMinute}
                      onChange={(e) =>
                        setStartMinute(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2.5 text-center text-sm font-bold text-white focus:outline-none appearance-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-2 uppercase tracking-widest font-bold">
                    Fim
                  </label>
                  <div className="flex bg-white/[0.02] border border-white/[0.08] rounded-xl focus-within:border-[#0a84ff] overflow-hidden transition-all">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      disabled={isRunning}
                      value={endHour}
                      onChange={(e) =>
                        setEndHour(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2.5 text-center text-sm font-bold text-white focus:outline-none appearance-none font-mono"
                    />
                    <span className="py-2.5 text-zinc-600 font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      disabled={isRunning}
                      value={endMinute}
                      onChange={(e) =>
                        setEndMinute(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2.5 text-center text-sm font-bold text-white focus:outline-none appearance-none font-mono"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 italic mt-2.5 leading-relaxed">
                A cópia apenas ocorrerá de fato no intervalo de tempo especificado (baseado no relógio do sistema).
              </p>
            </div>

            {isRunning ? (
              <div className="space-y-2.5">
                <button
                  onClick={finalizeProcess}
                  className="w-full py-3.5 rounded-xl bg-[#30d158] hover:bg-[#28b34b] text-white hover:shadow-[0_4px_16px_rgba(48,209,88,0.35)] transition-all flex items-center justify-center gap-2 font-bold cursor-pointer active:scale-98"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalizar Processo
                </button>
                <button
                  onClick={stopProcess}
                  className="w-full py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/15 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-98"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Interromper (Descartar Relatório)
                </button>
              </div>
            ) : (
              <button
                disabled={
                  (selectedMode !== 'watch' &&
                    (pendingFiles.length === 0 ||
                      (selectedMode === 'scheduled' && sendLimit <= 0))) ||
                  isStarting
                }
                onClick={startProcess}
                className={`w-full py-3.5 rounded-xl text-white transition-all flex items-center justify-center gap-2 font-bold group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${selectedMode === 'watch' ? 'bg-purple-600 hover:bg-purple-700 hover:shadow-[0_4px_16px_rgba(147,51,234,0.4)]' : 'glass-btn-primary'}`}
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current group-hover:scale-105 transition-transform" />
                )}
                {selectedMode === 'watch'
                  ? 'Iniciar Modo Standby'
                  : 'Iniciar Sincronização'}
              </button>
            )}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2 select-none">
            Status do Processo
            {isRunning && (
              <span className="flex h-2 w-2 relative ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0a84ff]/60 opacity-100"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0a84ff]"></span>
              </span>
            )}
          </h3>

          {!isRunning && !isFinished ? (
            <div className="h-56 flex flex-col items-center justify-center text-zinc-500 gap-3.5 bg-white/[0.008] border border-dashed border-white/[0.04] rounded-2xl">
              <AlertCircle className="w-10 h-10 opacity-30 text-zinc-400" />
              <p className="text-xs font-semibold">Aguardando início do processo...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {status.progress !== undefined && (
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-zinc-500 uppercase tracking-wider">
                      {isFinished ? 'Concluído' : 'Processando...'}
                    </span>
                    <span className="text-white font-black text-sm">{status.progress}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.05] p-[1px]">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#0a84ff] to-[#00c6ff] rounded-full shadow-[0_0_12px_rgba(10,132,255,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${status.progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {currentMode === 'watch' && (
                <div className="flex items-center gap-4 bg-purple-500/8 border border-purple-500/15 p-4 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 flex flex-col items-center justify-center relative">
                    <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="text-white font-bold tracking-tight text-xs">
                      Standby Ativo {status.watchBatchEnabled ? `(Lote de ${status.watchBatchLimit})` : ''}
                    </h4>
                    <p className="text-[11px] text-purple-200">
                      {status.watchBatchEnabled 
                        ? `Monitorando. Mantendo o lote limitado a um máximo de ${status.watchBatchLimit} arquivos.`
                        : 'Procurando por novos arquivos na de origem...'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 select-none">
                <div className="bg-white/[0.012] p-4 rounded-xl border border-white/[0.04]">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">
                    Copiados
                  </p>
                  <p className="text-2xl font-black text-[#30d158]">
                    {status.copied}
                  </p>
                </div>
                <div className="bg-white/[0.012] p-4 rounded-xl border border-white/[0.04]">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">
                    Falhas
                  </p>
                  <p className="text-2xl font-black text-rose-500">
                    {status.failed}
                  </p>
                </div>
                <div className="bg-white/[0.012] p-4 rounded-xl border border-white/[0.04]">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">
                    {currentMode === 'watch' ? 'Fila Standby' : 'Total Lote'}
                  </p>
                  <p className="text-2xl font-black text-[#0a84ff]">
                    {status.total}
                  </p>
                </div>
              </div>

              {isFinished && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl bg-[#30d158]/5 border border-[#30d158]/12 text-center"
                >
                  <CheckCircle className="w-10 h-10 text-[#30d158] mx-auto mb-3" />
                  <h4 className="text-base font-extrabold text-white mb-1.5">
                    {currentMode === 'watch' ? 'Standby Finalizado' : 'Lote Finalizado com Sucesso'}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-5 max-w-[340px] mx-auto">
                    {currentMode === 'watch'
                      ? 'Processo standby finalizado. Você agora pode enviar o relatório de arquivos copiados para o WhatsApp.'
                      : 'Todos os arquivos do lote foram sincronizados perfeitamente com os caminhos corretos.'}
                  </p>
                  <button
                    onClick={openWhatsApp}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#25d366] hover:bg-[#20ba59] hover:shadow-[0_4px_16px_rgba(37,211,102,0.4)] text-white rounded-xl transition-all duration-200 mx-auto font-bold text-xs cursor-pointer active:scale-95 border border-white/10"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    Enviar para WhatsApp (81 98651-733)
                  </button>
                </motion.div>
              )}

              {isRunning && (
                <div className="space-y-4">
                  {status.waitingForWindow && status.nextCopyAt > now ? (
                    <div className="flex items-center gap-4 bg-[#ff9f0a]/5 border border-[#ff9f0a]/10 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-[#ff9f0a]/10 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#ff9f0a]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[#ff9f0a] uppercase tracking-widest font-bold">
                          Fora do Expediente
                        </p>
                        <p className="text-xs font-semibold text-zinc-300 truncate">
                          Aguardando início do horário configurado...
                        </p>
                      </div>
                      <div className="text-lg font-black font-mono text-[#ff9f0a] shrink-0">
                        {Math.floor(
                          Math.max(0, status.nextCopyAt - now) / 3600000,
                        )
                          .toString()
                          .padStart(2, '0')}
                        :
                        {Math.floor(
                          (Math.max(0, status.nextCopyAt - now) % 3600000) /
                            60000,
                        )
                          .toString()
                          .padStart(2, '0')}
                        :
                        {Math.floor(
                          (Math.max(0, status.nextCopyAt - now) % 60000) / 1000,
                        )
                          .toString()
                          .padStart(2, '0')}
                      </div>
                    </div>
                  ) : status.currentFileWaiting &&
                    status.nextCopyAt &&
                    status.nextCopyAt > now ? (
                     <div className="flex items-center gap-4 bg-[#0a84ff]/5 border border-[#0a84ff]/10 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-[#0a84ff]/10 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-[#0a84ff] animate-spin" style={{ animationDuration: '4s' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-[#0a84ff] uppercase tracking-widest font-bold">
                          Intervalo entre Cópias
                        </p>
                        <p className="text-xs font-semibold text-zinc-350 truncate">
                          Próximo: <span className="text-white font-extrabold">{status.currentFileWaiting}</span>
                        </p>
                      </div>
                      <div className="text-lg font-black font-mono text-[#0a84ff] shrink-0">
                        {Math.floor(
                          Math.max(0, status.nextCopyAt - now) / 60000,
                        )
                          .toString()
                          .padStart(2, '0')}
                        :
                        {Math.floor(
                          (Math.max(0, status.nextCopyAt - now) % 60000) / 1000,
                        )
                          .toString()
                          .padStart(2, '0')}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2.5">
                    <h5 className="text-[9px] uppercase tracking-widest font-black text-zinc-500">
                      Terminal de Atividade (Tempo Real):
                    </h5>
                    <div className="h-40 bg-zinc-950/60 rounded-xl border border-white/[0.04] p-4.5 font-mono text-[11px] overflow-y-auto space-y-2.5 flex flex-col-reverse custom-scrollbar">
                      {[...copiedLog].reverse().map((entry: any, i: number) => (
                        <div
                          key={`${entry.name}-${entry.copiedAtMs || entry.copiedAt || i}`}
                          className="flex gap-2 text-[#30d158]/90"
                        >
                          <span className="opacity-40">
                            [{formatLogTime(entry.copiedAt || entry.copiedAtMs)}]
                          </span>
                          <span className="font-bold">OK:</span>
                          <span className="text-zinc-300 leading-tight">{entry.name} copiado com sucesso.</span>
                        </div>
                      ))}
                      <div className="text-[#0a84ff]/80 flex gap-2">
                        <span className="opacity-40">[{formatLogTime(status.startTime)}]</span>
                        <span className="font-semibold">HOST:</span>
                        <span>
                          {currentMode === 'watch'
                            ? 'Standby iniciado. Monitorando diretórios de imagens...'
                            : 'Iniciando cópia ordenada do lote...'}
                        </span>
                      </div>
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
