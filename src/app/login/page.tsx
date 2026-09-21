import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/modules/usuarios/components/login-form";

export default function LoginPage() {
  return (
    <main className="login-page relative isolate grid min-h-dvh bg-white text-black lg:grid-cols-[1.1fr_1fr]">
      <div aria-hidden="true" className="login-backdrop"><div className="login-wave login-wave-one" /><div className="login-wave login-wave-two" /></div>
      <section className="login-showcase relative isolate min-h-0 hidden flex-col overflow-hidden px-10 py-8 text-white lg:flex xl:px-16 xl:py-10">
        <div aria-hidden="true" className="login-glow" />
        <p className="login-reveal text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">Connecta · Central de operações</p>
        <div aria-hidden="true" className="login-orbits">
          <div className="login-orbit login-orbit-one"><span /></div>
          <div className="login-orbit login-orbit-two"><span /></div>
          <div className="login-orbit login-orbit-three"><span /></div>
          <div className="login-orbit-core" />
        </div>
        <div className="login-reveal login-delay-1 relative z-10 mt-auto pb-6 xl:pb-10">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-red-100">Relacionamentos que movem sua empresa</p>
          <h2 className="max-w-lg text-[clamp(2rem,3.4vw,3.5rem)] font-medium leading-[1.08] tracking-[-0.045em]">Conexões melhores.<br /><span className="text-white/85">Novas possibilidades.</span></h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-red-50">Transforme contatos em relacionamentos e acompanhe cada etapa do atendimento com clareza.</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-white/85">
            <span>Atendimento</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-white" /><span>Relacionamento</span><span aria-hidden="true" className="h-1 w-1 rounded-full bg-white" /><span>Resultados</span>
          </div>
        </div>
      </section>
      <section aria-labelledby="login-heading" className="login-access relative flex min-h-0 flex-col justify-center px-6 py-5 sm:px-12 lg:px-14">
        <div className="mx-auto w-full max-w-[380px]">
          <div aria-hidden="true" className="login-accent mb-5 h-1 w-12 rounded-full" />
          <div className="login-reveal">
            <img src="/brand/logosem-transparente.png" alt="Connecta Telecom" className="mb-6 h-auto w-[150px] object-contain" />
            <h1 id="login-heading" className="text-[28px] font-semibold leading-tight tracking-[-0.035em] sm:text-[32px]">Bem-vindo à<br />sua central Connecta.</h1>
            <p className="mb-6 mt-3 text-sm leading-6 text-black">Entre com suas credenciais para iniciar sua jornada de trabalho.</p>
          </div>
          <div className="login-reveal login-delay-1">
            <Suspense fallback={<div role="status" className="h-64 rounded-xl bg-neutral-100 p-5 text-sm text-black">Preparando seu acesso...</div>}><LoginForm /></Suspense>
          </div>
          <div className="login-reveal login-delay-2 mt-5 border-t border-red-100 pt-4">
            <p className="text-xs font-medium text-black">Primeiro acesso ou senha esquecida?</p>
            <p className="mt-2 text-xs leading-5 text-black">O administrador da sua equipe pode ajudar você a acessar sua conta.</p>
          </div>
          <div className="login-reveal login-delay-2 mt-5 flex items-center gap-2 text-[10px] tracking-wide text-black">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> Connecta Telecom · Acesso corporativo
          </div>
        </div>
      </section>
    </main>
  );
}
