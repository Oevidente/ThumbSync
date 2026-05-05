import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar.tsx";
import { Dashboard } from "./views/Dashboard.tsx";
import { Analyzer } from "./views/Analyzer.tsx";
import { ProgressView } from "./views/ProgressView.tsx";
import { ListView } from "./views/ListView.tsx";
import { SettingsView } from "./views/SettingsView.tsx";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error(e);
    }
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyze");
      const data = await res.json();
      setAnalysisData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    runAnalysis();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard analysisData={analysisData} onRefresh={runAnalysis} />;
      case "analyzer":
        return <Analyzer analysisData={analysisData} runAnalysis={runAnalysis} isLoading={isLoading} />;
      case "progress":
        return <ProgressView pendingFiles={analysisData?.pendingFiles || []} />;
      case "list":
        return <ListView gameListData={analysisData?.gameListData} />;
      case "settings":
        return <SettingsView config={config} onSave={fetchConfig} />;
      default:
        return <Dashboard analysisData={analysisData} onRefresh={runAnalysis} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="ml-[260px] flex-1 p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-6xl mx-auto"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
