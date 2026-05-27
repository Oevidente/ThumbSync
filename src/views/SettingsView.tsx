import { useState, useEffect } from "react";
import { GlassCard } from "../components/GlassCard.tsx";
import { Save, Info, CheckCircle, Clock, Calendar, Smartphone, ShieldCheck, ShieldAlert } from "lucide-react";

export function SettingsView({ config, onSave }: { config: any, onSave: () => void }) {
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [list, setList] = useState("");
  const [simulateDates, setSimulateDates] = useState(true);
  const [simulateDateMinutesOffset, setSimulateDateMinutesOffset] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setSource(config.source || "");
      setDest(config.dest || "");
      setList(config.list || "");
      setSimulateDates(config.simulateDates !== undefined ? !!config.simulateDates : true);
      setSimulateDateMinutesOffset(config.simulateDateMinutesOffset !== undefined ? Number(config.simulateDateMinutesOffset) : 1);
    }
  }, [config]);

  if (!config) return null;

  async function handleSaveSettings() {
    setIsSaving(true);
    setIsSaved(false);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          source, 
          dest, 
          list, 
          simulateDates, 
          simulateDateMinutesOffset 
        })
      });
      if (res.ok) {
        setIsSaved(true);
        onSave(); // Refetches from backend and syncs global application config state
        setTimeout(() => setIsSaved(false), 4000);
      }
    } catch (e) {
      console.error("Erro ao salvar configurações:", e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in relative z-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Configurações</h1>
        <p className="text-zinc-400 text-xs md:text-sm font-semibold tracking-wide">Gerencie os caminhos físicos de disco da aplicação e opções de metadados.</p>
      </div>

      <GlassCard className="max-w-2xl shadow-2xl">
         {isSaved ? (
           <div className="flex items-center gap-3 p-4 bg-[#30d158]/5 border border-[#30d158]/12 rounded-2xl mb-8 text-[#30d158] text-xs font-semibold animate-fade-in">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-[#30d158]" />
              <p>Configurações salvas e aplicadas com sucesso pelo servidor!</p>
           </div>
         ) : (
           <div className="flex items-center gap-3 p-4 bg-[#0a84ff]/5 border border-[#0a84ff]/12 rounded-2xl mb-8 text-[#0a84ff] text-xs font-semibold">
              <Info className="w-5 h-5 flex-shrink-0" />
              <p>As alterações feitas aqui serão aplicadas ao servidor e persistidas durante a sessão atual de sincronia.</p>
           </div>
         )}

         <div className="space-y-6">
            <div className="space-y-2">
               <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-sans">Diretório de Origem (Creative Cloud Files)</label>
               <input
                 type="text"
                 value={source}
                 onChange={(e) => setSource(e.target.value)}
                 placeholder="Diretório de origem das miniaturas .webp"
                 className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/10 focus:border-[#0a84ff] focus:bg-white/[0.05] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                 id="input-source-dir"
               />
            </div>

            <div className="space-y-2">
               <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-sans">Diretório de Destino (Google Drive)</label>
               <input
                 type="text"
                 value={dest}
                 onChange={(e) => setDest(e.target.value)}
                 placeholder="Diretório de destino sincronizado"
                 className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/10 focus:border-[#0a84ff] focus:bg-white/[0.05] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                 id="input-dest-dir"
               />
            </div>

            <div className="space-y-2">
               <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-sans">Arquivo de Lista (.txt)</label>
               <input
                 type="text"
                 value={list}
                 onChange={(e) => setList(e.target.value)}
                 placeholder="Arquivo lista.txt contendo controle de jogos ordenados"
                 className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/10 focus:border-[#0a84ff] focus:bg-white/[0.05] rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                 id="input-list-file"
               />
            </div>

            <div className="border-t border-white/[0.06] pt-6">
               <h4 className="text-sm font-extrabold text-white mb-3.5 flex items-center gap-2">
                 <Calendar className="w-4.5 h-4.5 text-[#0a84ff]" />
                 Simulação de Metadados de Data/Hora (Drive)
               </h4>
               <p className="text-xs text-zinc-450 mb-5 font-semibold leading-relaxed">
                 Atualiza as datas de criação/modificação dos arquivos no disco (origem e destino) para o momento exato em que são copiados. Isso faz com que no Google Drive eles apareçam sincronizados em tempo real, como se tivessem sido criados exatamente agora.
               </p>

               <div className="space-y-4 rounded-2xl bg-white/[0.012] border border-white/[0.05] p-5">
                 <div className="flex items-center justify-between gap-4">
                   <div className="flex flex-col gap-1">
                     <label className="text-xs font-bold text-zinc-300">Habilitar Simulação de Data/Hora</label>
                     <p className="text-[11px] text-zinc-500 leading-relaxed max-w-sm">Deixe ativado para modificar a data de modificação dos arquivos para o horário exato da cópia.</p>
                   </div>
                   <button
                     onClick={() => setSimulateDates(!simulateDates)}
                     id="btn-toggle-simulate-dates"
                     className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${simulateDates ? 'bg-[#0a84ff]' : 'bg-white/10'}`}
                   >
                     <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-250 ease-in-out ${simulateDates ? 'translate-x-5' : 'translate-x-0'}`} />
                   </button>
                 </div>

                 {simulateDates && (
                   <div className="pt-4.5 border-t border-white/[0.05] space-y-3.5 shrink-0 animate-fade-in">
                     <label className="block text-xs font-bold text-zinc-400">Margem de Antecipação (Minutos antes da cópia)</label>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                       <input
                         type="number"
                         min="0"
                         max="60"
                         value={simulateDateMinutesOffset}
                         onChange={(e) => setSimulateDateMinutesOffset(Math.max(0, parseInt(e.target.value) || 0))}
                         className="w-24 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#0a84ff] focus:bg-white/[0.05] transition-all font-mono text-center"
                         id="input-simulate-offset"
                       />
                       <span className="text-[11px] text-zinc-500 flex items-center gap-2 font-semibold">
                         <Clock className="w-4 h-4 text-zinc-650 shrink-0" />
                         {simulateDateMinutesOffset === 0 
                           ? "A data será exatamente do segundo em que o arquivo for copiado." 
                           : simulateDateMinutesOffset === 1
                             ? "Define a data para 1 minuto antes do momento exato da cópia."
                             : `Define a data para ${simulateDateMinutesOffset} minutos antes do momento exato da cópia.`}
                       </span>
                     </div>
                   </div>
                 )}
               </div>
            </div>

            <div className="pt-4 flex justify-end select-none">
               <button 
                 onClick={handleSaveSettings}
                 disabled={isSaving || !source || !dest || !list}
                 id="btn-save-settings"
                 className="glass-btn-primary"
               >
                 <Save className="w-4 h-4" />
                 {isSaving ? "Salvando..." : "Salvar Configurações"}
               </button>
            </div>
         </div>
      </GlassCard>

       {/* PWA Local Network Installation Diagnostics Guide */}
       <GlassCard className="max-w-2xl shadow-2xl border-white/[0.05]">
          <h3 className="text-base md:text-lg font-extrabold text-white mb-2.5 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#0a84ff]" />
            Como instalar no Celular (Modo Web Local)
          </h3>
          <p className="text-xs text-zinc-400 mb-5 font-semibold leading-relaxed">
            Como esta aplicação é executada em sua máquina local (<span className="font-mono text-white bg-white/5 px-1.5 py-0.5 rounded">localhost</span>), ao acessá-lo pelo celular usando a sua rede Wi-Fi, o navegador móvel bloqueia o ícone de instalação padrão do PWA. Isso ocorre porque o link acessado utiliza o protocolo <span className="text-[#ff453a] font-bold">HTTP</span> padrão, enquanto que por segurança os navegadores exigem <span className="text-[#30d158] font-bold">HTTPS</span> (origem segura) para permitir instalações de PWAs móveis.
          </p>

          {/* Estado de Segurança do Navegador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white/[0.015] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Contexto de Segurança</span>
              {typeof window !== 'undefined' && window.isSecureContext ? (
                <span className="text-[11px] font-bold text-[#30d158] flex items-center gap-1.5">
                  <ShieldCheck className="w-4.5 h-4.5" /> Seguro (Localhost / HTTPS) ✓
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#ff453a] flex items-center gap-1.5">
                  <ShieldAlert className="w-4.5 h-4.5" /> Não Seguro (Rede Local HTTP) ⚠️
                </span>
              )}
              <p className="text-[10px] text-zinc-500 leading-relaxed mt-1 font-semibold">
                {typeof window !== 'undefined' && window.isSecureContext 
                  ? "Seu navegador reconhece esta origem como totalmente segura e permite a instalação nativa do PWA!" 
                  : "Por regras de segurança móvel, conexões HTTP em IPs locais (ex: 192.168.x.x) bloqueiam registros automáticos de PWA."}
              </p>
            </div>

            <div className="bg-white/[0.015] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Registro de Service Worker</span>
              {typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? (
                <span className="text-[11px] font-bold text-[#30d158] flex items-center gap-1.5">
                  <CheckCircle className="w-4.5 h-4.5" /> Pronto / Disponível ✓
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#ff453a] flex items-center gap-1.5">
                  <ShieldAlert className="w-4.5 h-4.5" /> Desativado no Navegador ❌
                </span>
              )}
              <p className="text-[10px] text-zinc-500 leading-relaxed mt-1 font-semibold">
                {typeof navigator !== 'undefined' && 'serviceWorker' in navigator 
                  ? "Service worker em sw.js está disponível para controle de cache e recursos offline." 
                  : "Não foi possível detectar suporte a service worker neste navegador ou contexto."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
             <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest leading-relaxed">Como resolver e habilitar o botão de Instalar?</h4>
             
             <div className="space-y-4 font-sans text-xs text-zinc-400">
                {/* Metodo 1 */}
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                     <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#0a84ff]">1</span>
                     <span className="text-xs font-bold text-white">Opção Recomendada: Ignorar Bloqueio no Chrome Móvel (Mais Rápido)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 pl-7 leading-relaxed font-semibold">
                    No navegador Google Chrome do seu celular, você pode instruir o navegador a considerar o IP local do seu computador como uma origem totalmente segura:
                  </p>
                  <ol className="text-[11px] text-zinc-400 pl-11 space-y-2 list-decimal font-semibold">
                    <li>Abra o navegador Google Chrome no celular e acesse o endereço especial: <code className="text-[#0a84ff] font-mono break-all bg-white/5 px-1.5 py-0.5 rounded">chrome://flags</code></li>
                    <li>No campo de busca no topo, digite: <code className="text-zinc-200 font-mono">insecure origins</code></li>
                    <li>Você verá a opção <span className="font-bold text-white">"Insecure origins treated as secure"</span>. Altere ela de <span className="text-zinc-500 font-bold">"Disabled"</span> para <span className="text-[#30d158] font-bold">"Enabled"</span>.</li>
                    <li>No campo de texto associado a esta opção (onde diz "Ex: http://example.com"), digite a URL e porta local do site, ex: <code className="text-[#0a84ff] font-bold font-mono bg-white/5 px-1 py-0.5 rounded">http://192.168.1.15:3000</code> (substituindo pelo IP correto do seu computador e porta 3000).</li>
                    <li>Clique no botão azul <span className="font-bold text-white bg-[#0a84ff] px-2 py-0.5 rounded">Relaunch</span> no canto inferior para reiniciar o Chrome.</li>
                    <li>Acesse de novo o site no celular. Pronto! Agora o logo estará carregado com as resoluções do PWA e a opção **"Instalar Aplicativo"** estará disponível sem problemas!</li>
                  </ol>
                </div>

                {/* Metodo 2 */}
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                     <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#0a84ff]">2</span>
                     <span className="text-xs font-bold text-white">Opção B: Port Forwarding via Depuração USB (Nativo do Android)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 pl-7 leading-relaxed font-semibold">
                    Se você conectar seu celular ao computador com um cabo de dados USB e habilitar a <strong>Depuração USB</strong> nas opções de desenvolvedor do smartphone:
                  </p>
                  <ol className="text-[11px] text-zinc-400 pl-11 space-y-2 list-decimal font-semibold">
                    <li>Abra o navegador Google Chrome no computador e digite: <code className="text-zinc-250 font-mono">chrome://inspect</code></li>
                    <li>Fique de olho e clique na opção <span className="font-bold text-white">Port forwarding...</span></li>
                    <li>Adicione a porta <span className="font-mono text-[#0a84ff]">3000</span> mapeando para o endereço de IP e porta <span className="font-mono text-zinc-200">localhost:3000</span>. Marque a caixa para habilitar.</li>
                    <li>Agora, abra o Chrome diretamente do seu smartphone e digite literalmente: <code className="text-[#0a84ff] font-bold font-mono">http://localhost:3000</code></li>
                    <li>Como o telefone agora acessa via o endereço local nativo, o PWA funciona instantaneamente e você poderá instalá-lo de forma limpa e nativa de primeira!</li>
                  </ol>
                </div>

                {/* Metodo 3 */}
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                     <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#0a84ff]">3</span>
                     <span className="text-xs font-bold text-white">Opção C: Gerar link de rede seguro usando Túneis Locais (ex: Ngrok / Localtunnel)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 pl-7 leading-relaxed font-semibold">
                    Caso queira uma solução sem fios e sem configurações no navegador, você pode acionar serviços gratuitos de tunelamento no terminal do computador, exemplo: <code className="text-zinc-200 font-mono bg-white/5 px-1 px-1 rounded">npx localtunnel --port 3000</code> ou <code className="text-zinc-200 font-mono bg-white/5 px-1 rounded">ngrok http 3000</code>. Eles fornecem um link HTTPS público único e criptografado que roda diretamente e permite a instalação transparente de qualquer dispositivo móvel.
                  </p>
                </div>
             </div>
          </div>
       </GlassCard>
    </div>
  );
}
