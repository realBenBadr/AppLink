"use client";

import CodeViewer from "@/components/code-viewer";
import { useScrollTo } from "@/hooks/use-scroll-to";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowLongRightIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useState, useCallback } from "react";
import LoadingDots from "../../components/loading-dots";
import debounce from 'lodash/debounce';

function removeCodeFormatting(code: string): string {
  return code.replace(/```(?:typescript|javascript|tsx)?\n([\s\S]*?)```/g, '$1').trim();
}

export default function Home() {
  let [status, setStatus] = useState<
    "initial" | "creating" | "created" | "updating" | "updated"
  >("initial");
  let [prompt, setPrompt] = useState("");
  let models = [
    {
      label: "gemini-exp-1206",
      value: "gemini-exp-1206",
    },
    {
      label: "gemini-2.0-flash-exp",
      value: "gemini-2.0-flash-exp",
    },
    {
      label: "gemini-1.5-pro",
      value: "gemini-1.5-pro",
    },
    {
      label: "gemini-1.5-flash",
      value: "gemini-1.5-flash",
    }
  ];
  let [model, setModel] = useState(models[0].value);
  let [modification, setModification] = useState("");
  let [generatedCode, setGeneratedCode] = useState("");
  let [initialAppConfig, setInitialAppConfig] = useState({
    model: "",
  });
  let [ref, scrollTo] = useScrollTo();
  let [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  let [modificationPrompt, setModificationPrompt] = useState("");
  let [isModifying, setIsModifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let loading = status === "creating" || status === "updating";

  async function createApp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (status !== "initial") {
      scrollTo({ delay: 0.5 });
    }

    setStatus("creating");
    setGeneratedCode("");

    try {
      let res = await fetch("/api/generateCode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to generate code");
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      let receivedData = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        receivedData += new TextDecoder().decode(value);
        const cleanedData = removeCodeFormatting(receivedData);
        setGeneratedCode(cleanedData);
      }

      setMessages([{ role: "user", content: prompt }]);
      setInitialAppConfig({ model });
      setStatus("created");
    } catch (error) {
      console.error("Error generating code:", error);
      setError(error instanceof Error ? error.message : "Failed to generate code");
      setStatus("initial");
    }
  }

  // Debounced function to modify code
  const debouncedModifyCode = useCallback(
    debounce(async (prompt: string) => {
      if (!prompt.trim() || !generatedCode) return;
      
      setIsModifying(true);
      setStatus("updating");

      try {
        const res = await fetch("/api/modify-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: generatedCode,
            prompt: prompt,
            model: model,
          }),
        });

        if (!res.ok) {
          throw new Error(res.statusText);
        }

        const modifiedCode = await res.text();
        const cleanedCode = removeCodeFormatting(modifiedCode);
        setGeneratedCode(cleanedCode);
        setStatus("updated");
      } catch (error) {
        console.error("Error modifying app:", error);
      } finally {
        setIsModifying(false);
      }
    }, 500),
    [generatedCode, model]
  );

  // Handle modification prompt changes
  const handleModificationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModificationPrompt(e.target.value);
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleModifySubmit();
    }
  };

  // Handle modification submit
  const handleModifySubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!modificationPrompt.trim() || !generatedCode || isModifying) return;
    
    setIsModifying(true);
    setStatus("updating");

    try {
      const res = await fetch("/api/modify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: generatedCode,
          prompt: modificationPrompt,
          model: model,
        }),
      });

      if (!res.ok) {
        throw new Error(res.statusText);
      }

      const modifiedCode = await res.text();
      const cleanedCode = removeCodeFormatting(modifiedCode);
      setGeneratedCode(cleanedCode);
      setStatus("updated");
      setModificationPrompt(""); // Clear the prompt after successful modification
    } catch (error) {
      console.error("Error modifying app:", error);
    } finally {
      setIsModifying(false);
    }
  };

  // Cancel debounced calls on unmount
  useEffect(() => {
    return () => {
      debouncedModifyCode.cancel();
    };
  }, [debouncedModifyCode]);

  useEffect(() => {
    let el = document.querySelector(".cm-scroller");
    if (el && loading) {
      let end = el.scrollHeight - el.clientHeight;
      el.scrollTo({ top: end });
    }
  }, [loading, generatedCode]);

  // Handle main prompt key press
  const handleMainPromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        // Ctrl+Enter: Add new line
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newValue = value.substring(0, start) + '\n' + value.substring(end);
        setPrompt(newValue);
        // Set cursor position after the new line
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      } else {
        // Enter only: Submit form
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form && !loading && prompt.trim()) {
          form.requestSubmit();
        }
      }
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Futuristic animated background */}
      <div className="fixed inset-0 -z-10">
        {/* Primary gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white dark:from-black dark:via-blue-950 dark:to-black dark:animate-gradient-slow">
          {/* Animated mesh gradient overlay */}
          <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),rgba(59,130,246,0)_50%)] dark:opacity-50 dark:bg-[radial-gradient(circle_at_50%_50%,rgba(0,149,255,0.1),rgba(0,149,255,0)_50%)] dark:animate-pulse-slow"></div>
          
          {/* Tech pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]"></div>
          
          {/* Glowing orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/40 rounded-full filter blur-3xl animate-float dark:bg-blue-500/20"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/40 rounded-full filter blur-3xl animate-float-delayed dark:bg-indigo-500/20"></div>
        </div>
      </div>

      <div className="relative mt-12 flex w-full flex-1 flex-col items-center px-4 text-center sm:mt-1">
        <a
          className="mb-4 inline-flex h-7 shrink-0 items-center gap-[9px] rounded-[50px] border border-blue-500/30 bg-black/40 backdrop-blur-md px-7 py-5 shadow-[0_0_15px_rgba(0,149,255,0.1)] hover:shadow-[0_0_20px_rgba(0,149,255,0.2)] transition-all duration-300 dark:border-blue-500/20"
          href="https://ai.google.dev/gemini-api/docs"
          target="_blank"
        >
          <span className="text-center text-blue-100">
            Powered by <span className="font-medium text-blue-400">Gemini API</span>
          </span>
        </a>
        <h1 className="my-6 max-w-3xl text-4xl font-bold text-gray-800 dark:text-white sm:text-6xl">
          Turn your <span className="text-blue-600">idea</span>
          <br /> into an <span className="text-blue-600">App</span>
          <br /> with <span className="text-blue-600">AppLink</span>
        </h1>

        {error && (
          <div className="mt-4 w-full max-w-xl rounded-lg bg-red-50/90 backdrop-blur-sm p-4 text-red-800 dark:bg-red-900/50 dark:text-red-200">
            <p>{error}</p>
          </div>
        )}

        <form className="w-full max-w-xl backdrop-blur-lg rounded-3xl p-1" onSubmit={createApp}>
          <fieldset disabled={loading} className="disabled:opacity-75">
            <div className="relative mt-5">
              <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10 animate-pulse-slow" />
              <div className="relative flex rounded-3xl bg-black/40 backdrop-blur-md border border-blue-500/20 shadow-[0_0_15px_rgba(0,149,255,0.1)]">
                <div className="relative flex flex-grow items-stretch focus-within:z-10">
                  <textarea
                    rows={3}
                    required
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleMainPromptKeyDown}
                    name="prompt"
                    className="w-full resize-none rounded-l-3xl bg-transparent px-6 py-5 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-gray-100 dark:placeholder-gray-400"
                    placeholder="Build me a calculator app..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-3xl px-3 py-2 text-sm font-semibold text-blue-500 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:text-gray-900 dark:disabled:text-gray-400"
                >
                  {status === "creating" ? (
                    <LoadingDots color="black" style="large" />
                  ) : (
                    <ArrowLongRightIcon className="-ml-0.5 size-6" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex items-center justify-between gap-3 sm:justify-center">
                <p className="text-gray-500 dark:text-gray-400 sm:text-xs">Model:</p>
                <Select.Root
                  name="model"
                  disabled={loading}
                  value={model}
                  onValueChange={(value) => setModel(value)}
                >
                  <Select.Trigger className="group flex w-60 max-w-xs items-center rounded-2xl border-[6px] border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E293B] px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                    <Select.Value />
                    <Select.Icon className="ml-auto">
                      <ChevronDownIcon className="size-6 text-gray-300 group-focus-visible:text-gray-500 group-enabled:group-hover:text-gray-500 dark:text-gray-600 dark:group-focus-visible:text-gray-400 dark:group-enabled:group-hover:text-gray-400" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="overflow-hidden rounded-md bg-white dark:bg-[#1E293B] shadow-lg">
                      <Select.Viewport className="p-2">
                        {models.map((model) => (
                          <Select.Item
                            key={model.value}
                            value={model.value}
                            className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800 data-[highlighted]:outline-none"
                          >
                            <Select.ItemText asChild>
                              <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <div className="size-2 rounded-full bg-green-500" />
                                {model.label}
                              </span>
                            </Select.ItemText>
                            <Select.ItemIndicator className="ml-auto">
                              <CheckIcon className="size-5 text-blue-600" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                      <Select.ScrollDownButton />
                      <Select.Arrow />
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            </div>
          </fieldset>
        </form>

        <hr className="border-1 mb-20 h-px bg-gray-700/30 dark:bg-gray-700/30 w-full max-w-xl" />

        {status !== "initial" && (
          <motion.div
            initial={{ height: 0 }}
            animate={{
              height: "auto",
              overflow: "hidden",
              transitionEnd: { overflow: "visible" },
            }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="w-full pb-[25vh] pt-1"
            onAnimationComplete={() => scrollTo()}
            ref={ref}
          >
            <div className="w-full max-w-xl mx-auto mb-8">
              <form onSubmit={handleModifySubmit} className="relative">
                <div className="absolute -inset-2 rounded-[32px] bg-gray-300/50 dark:bg-gray-800/50" />
                <div className="relative flex rounded-3xl bg-white dark:bg-[#1E293B] shadow-sm">
                  <div className="relative flex flex-grow items-stretch focus-within:z-10">
                    <textarea
                      rows={2}
                      value={modificationPrompt}
                      onChange={handleModificationChange}
                      onKeyDown={handleKeyDown}
                      name="modificationPrompt"
                      className="w-full resize-none rounded-l-3xl bg-transparent px-6 py-5 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-gray-100 dark:placeholder-gray-400"
                      placeholder="Modify the app (e.g., 'Add a dark mode toggle')..."
                      disabled={isModifying}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isModifying || !modificationPrompt.trim()}
                    className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-3xl px-6 py-2 text-sm font-semibold text-blue-500 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:text-gray-900 dark:disabled:text-gray-400"
                  >
                    {isModifying ? (
                      <LoadingDots color="black" style="small" />
                    ) : (
                      <ArrowLongRightIcon className="size-6" />
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="relative mt-8 w-full overflow-hidden">
              <div className="isolate">
                <CodeViewer code={generatedCode} showEditor />
              </div>

              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={status === "updating" ? { x: "100%" } : undefined}
                    animate={status === "updating" ? { x: "0%" } : undefined}
                    exit={{ x: "100%" }}
                    transition={{
                      type: "spring",
                      bounce: 0,
                      duration: 0.85,
                      delay: 0.5,
                    }}
                    className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center rounded-r border border-gray-400 dark:border-gray-700 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-[#1E293B] dark:to-gray-800 md:inset-y-0 md:left-1/2 md:right-0"
                  >
                    <p className="animate-pulse text-3xl font-bold dark:text-gray-100">
                      {status === "creating"
                        ? "Building your app..."
                        : "Updating your app..."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx global>{`
        @keyframes gradient-slow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes float-delayed {
          0% { transform: translateY(0px) scale(1.1); }
          50% { transform: translateY(-20px) scale(1); }
          100% { transform: translateY(0px) scale(1.1); }
        }
        @keyframes pulse-slow {
          0% { opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { opacity: 0.4; }
        }
        .animate-gradient-slow {
          animation: gradient-slow 15s ease infinite;
          background-size: 200% 200%;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 9s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}

async function minDelay<T>(promise: Promise<T>, ms: number) {
  let delay = new Promise((resolve) => setTimeout(resolve, ms));
  let [p] = await Promise.all([promise, delay]);

  return p;
}
