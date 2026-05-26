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
    await fetch('/api/copy/stop', { method: 'POST' });
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
  const currentMode = status.mode || selectedMode;
  const copiedLog =
    status.copiedLog ||
    status.copiedNames?.map((name: string) => ({
      name,
      copiedAt: status.startTime,
    })) ||
    [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Sincronização e Progresso
        </h1>
        <p className="text-gray-400">
          Controle o método de cópia dos arquivos pendentes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1 h-fit transform transition-all duration-300">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Modalidade de Envio
          </h3>
          <div className="space-y-6">
            <div className="flex bg-white/5 rounded-lg p-1 gap-1">
              <button
                disabled={isRunning}
                onClick={() => setSelectedMode('scheduled')}
                className={`flex-1 rounded-md py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${selectedMode === 'scheduled' ? 'bg-fluent-accent text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
              >
                <Clock className="w-3.5 h-3.5" />
                Lote
              </button>
              <button
                disabled={isRunning}
                onClick={() => setSelectedMode('immediate')}
                className={`flex-1 rounded-md py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${selectedMode === 'immediate' ? 'bg-fluent-accent text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
              >
                <Zap className="w-3.5 h-3.5" />
                Imediata
              </button>
              <button
                disabled={isRunning}
                onClick={() => setSelectedMode('watch')}
                className={`flex-1 rounded-md py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${selectedMode === 'watch' ? 'bg-fluent-accent text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
              >
                <Activity className="w-3.5 h-3.5" />
                Standby
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-widest font-bold">
                Ordem
              </label>
              <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-lg p-1">
                <button
                  disabled={isRunning}
                  onClick={() => setCopyOrder('newest')}
                  className={`min-h-10 rounded-md px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${copyOrder === 'newest' ? 'bg-fluent-accent text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
                >
                  <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                  Mais recente
                </button>
                <button
                  disabled={isRunning}
                  onClick={() => setCopyOrder('oldest')}
                  className={`min-h-10 rounded-md px-3 py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${copyOrder === 'oldest' ? 'bg-fluent-accent text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
                >
                  <ArrowUpWideNarrow className="w-3.5 h-3.5" />
                  Mais antigo
                </button>
              </div>
            </div>

            <div className="min-h-[100px]">
              {selectedMode === 'scheduled' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-fluent-accent disabled:opacity-50"
                    />
                  </div>
                </motion.div>
              )}
              {selectedMode === 'immediate' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-sm text-gray-300">
                    Copia{' '}
                    <span className="font-bold text-white">
                      {pendingFiles.length}
                    </span>{' '}
                    arquivos pendentes de uma só vez, sem atrasos.
                  </p>
                  <p className="text-[10px] text-orange-400 mt-2 italic font-semibold">
                    Uma confirmação será pedida antes de iniciar.
                  </p>
                </motion.div>
              )}
              {selectedMode === 'watch' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-sm text-gray-300">
                    A pasta de origem será monitorada continuamente. Novos
                    arquivos serão adicionados à fila e a divisão de tempo será
                    recalculada conforme o horário configurado.
                  </p>
                  <p className="text-[10px] text-purple-400 mt-2 italic font-semibold">
                    Sincronização standby com cálculo de divisão de tempo.
                  </p>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-widest font-bold">
                    Início
                  </label>
                  <div className="flex bg-white/5 border border-white/10 rounded-lg focus-within:border-fluent-accent overflow-hidden">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      disabled={isRunning}
                      value={startHour}
                      onChange={(e) =>
                        setStartHour(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2 text-center focus:outline-none appearance-none"
                    />
                    <span className="py-2 text-gray-500">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      disabled={isRunning}
                      value={startMinute}
                      onChange={(e) =>
                        setStartMinute(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2 text-center focus:outline-none appearance-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-widest font-bold">
                    Fim
                  </label>
                  <div className="flex bg-white/5 border border-white/10 rounded-lg focus-within:border-fluent-accent overflow-hidden">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      disabled={isRunning}
                      value={endHour}
                      onChange={(e) =>
                        setEndHour(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2 text-center focus:outline-none appearance-none"
                    />
                    <span className="py-2 text-gray-500">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      disabled={isRunning}
                      value={endMinute}
                      onChange={(e) =>
                        setEndMinute(parseInt(e.target.value) || 0)
                      }
                      className="w-full bg-transparent px-3 py-2 text-center focus:outline-none appearance-none"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 italic mt-2">
                A cópia apenas ocorrerá no intervalo de tempo especificado
                (baseado no relógio do sistema).
              </p>
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
                disabled={
                  (selectedMode !== 'watch' &&
                    (pendingFiles.length === 0 ||
                      (selectedMode === 'scheduled' && sendLimit <= 0))) ||
                  isStarting
                }
                onClick={startProcess}
                className={`w-full py-3 rounded-lg text-white transition-all flex items-center justify-center gap-2 font-semibold group disabled:opacity-50 disabled:cursor-not-allowed ${selectedMode === 'watch' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-fluent-accent hover:bg-fluent-accent-hover'}`}
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                )}
                {selectedMode === 'watch'
                  ? 'Iniciar Modo Standby'
                  : 'Iniciar Sincronização'}
              </button>
            )}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Status do Processo
            {isRunning && (
              <span className="flex h-2 w-2 relative ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
          </h3>

          {!isRunning && !isFinished ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-500 gap-4">
              <AlertCircle className="w-12 h-12 opacity-20" />
              <p>Aguardando início do processo...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {status.progress !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      {isFinished ? 'Concluído' : 'Processando...'}
                    </span>
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
              )}

              {currentMode === 'watch' && (
                <div className="flex items-center gap-4 bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex flex-col items-center justify-center relative">
                    <Activity className="w-5 h-5 text-purple-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold tracking-tight">
                      Standby Ativo
                    </h4>
                    <p className="text-sm text-purple-300">
                      Procurando por novos arquivos na origem...
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                    Copiados
                  </p>
                  <p className="text-2xl font-bold text-green-400">
                    {status.copied}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                    Falhas
                  </p>
                  <p className="text-2xl font-bold text-red-400">
                    {status.failed}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                    {currentMode === 'watch' ? 'Fila Standby' : 'Total Lote'}
                  </p>
                  <p className="text-2xl font-bold text-blue-400">
                    {status.total}
                  </p>
                </div>
              </div>

              {isFinished && currentMode !== 'watch' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
                >
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-bold mb-2">
                    Processo Finalizado com Sucesso!
                  </h4>
                  <p className="text-sm text-gray-400 mb-6">
                    Todos os arquivos do lote foram processados. Você pode agora
                    enviar o resumo via WhatsApp.
                  </p>
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
                  {status.waitingForWindow && status.nextCopyAt > now ? (
                    <div className="flex items-center gap-4 bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">
                          Fora do Expediente
                        </p>
                        <p className="text-sm font-medium">
                          Aguardando início do horário de trabalho
                          configurado...
                        </p>
                      </div>
                      <div className="text-xl font-bold font-mono text-orange-400">
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
                    <div className="flex items-center gap-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-400 animate-spin-slow" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">
                          Intervalo entre Arquivos
                        </p>
                        <p className="text-sm font-medium">
                          Próximo arquivo:{' '}
                          <span className="text-white">
                            {status.currentFileWaiting}
                          </span>
                        </p>
                      </div>
                      <div className="text-xl font-bold font-mono text-blue-400">
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

                  <div className="space-y-2">
                    <h5 className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
                      Atividade em Tempo Real:
                    </h5>
                    <div className="h-40 bg-black/30 rounded-lg border border-white/5 p-4 font-mono text-[11px] overflow-y-auto space-y-1 scrollbar-hide flex flex-col-reverse">
                      {[...copiedLog].reverse().map((entry: any, i: number) => (
                        <div
                          key={`${entry.name}-${entry.copiedAtMs || entry.copiedAt || i}`}
                          className="flex gap-2 text-green-500/80"
                        >
                          <span className="opacity-40">
                            [{formatLogTime(entry.copiedAt || entry.copiedAtMs)}
                            ]
                          </span>
                          <span className="font-semibold">OK:</span>
                          <span>{entry.name} sincronizado com sucesso.</span>
                        </div>
                      ))}
                      <div className="text-blue-400 opacity-50 flex gap-2">
                        <span>[{formatLogTime(status.startTime)}]</span>
                        <span>
                          {currentMode === 'watch'
                            ? 'Standby iniciado. Aguardando novos arquivos...'
                            : 'Iniciando sincronização...'}
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
