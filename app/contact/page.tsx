"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { api } from "@/lib/client";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Name is required";
    if (!form.email.includes("@")) next.email = "Valid email is required";
    if (form.phone.trim().length < 7) next.phone = "Phone is required";
    if (!form.company.trim()) next.company = "Company is required";
    if (form.message.trim().length < 8) next.message = "Please include a short message";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setSuccess("");
    try {
      const result = await api<{ message: string }>("/api/contact", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess(result.message);
      setForm({ name: "", email: "", phone: "", company: "", message: "" });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Submission failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 text-3xl font-semibold">Talk with VeloraCRM</h1>
      <p className="mt-2 text-sm text-muted">
        This public form creates a Website lead with status NEW and logs an activity event.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <FieldError message={errors.email} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <FieldError message={errors.phone} />
        </div>
        <div>
          <Label>Company</Label>
          <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <FieldError message={errors.company} />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <FieldError message={errors.message} />
        </div>
        <FieldError message={errors.form} />
        {success ? <p className="text-sm text-success">{success}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending..." : "Submit inquiry"}
        </Button>
      </form>
      <Link href="/login" className="mt-6 text-sm text-accent">
        Already a customer? Sign in
      </Link>
    </div>
  );
}
