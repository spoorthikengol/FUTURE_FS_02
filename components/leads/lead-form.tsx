"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES, type LeadDTO } from "@/types/crm";

export type LeadFormValue = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  source: LeadDTO["source"];
  status: LeadDTO["status"];
  value: number;
  priority: LeadDTO["priority"];
  message: string;
  followUpDate: string;
};

export const emptyLeadForm: LeadFormValue = {
  name: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  source: "Website",
  status: "NEW",
  value: 0,
  priority: "MEDIUM",
  message: "",
  followUpDate: "",
};

export function leadToForm(lead: LeadDTO): LeadFormValue {
  return {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.jobTitle,
    source: lead.source,
    status: lead.status,
    value: lead.value,
    priority: lead.priority,
    message: lead.message,
    followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 16) : "",
  };
}

export function LeadForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: LeadFormValue;
  submitLabel: string;
  onSubmit: (value: LeadFormValue) => Promise<void>;
}) {
  const [value, setValue] = useState<LeadFormValue>(initial ?? emptyLeadForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof LeadFormValue>(key: K, next: LeadFormValue[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (value.name.trim().length < 2) nextErrors.name = "Name is required";
    if (!value.email.includes("@")) nextErrors.email = "Valid email is required";
    if (value.phone.trim().length < 7) nextErrors.phone = "Phone is required";
    if (!value.company.trim()) nextErrors.company = "Company is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setLoading(true);
    try {
      await onSubmit(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" value={value.name} onChange={(e) => update("name", e.target.value)} />
        <FieldError message={errors.name} />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={value.email} onChange={(e) => update("email", e.target.value)} />
        <FieldError message={errors.email} />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={value.phone} onChange={(e) => update("phone", e.target.value)} />
        <FieldError message={errors.phone} />
      </div>
      <div>
        <Label htmlFor="company">Company</Label>
        <Input id="company" value={value.company} onChange={(e) => update("company", e.target.value)} />
        <FieldError message={errors.company} />
      </div>
      <div>
        <Label htmlFor="jobTitle">Job title</Label>
        <Input id="jobTitle" value={value.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="value">Lead value</Label>
        <Input
          id="value"
          type="number"
          min={0}
          value={value.value}
          onChange={(e) => update("value", Number(e.target.value))}
        />
      </div>
      <div>
        <Label htmlFor="source">Source</Label>
        <Select id="source" value={value.source} onChange={(e) => update("source", e.target.value as LeadDTO["source"])}>
          {LEAD_SOURCES.map((source) => (
            <option key={source}>{source}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select id="status" value={value.status} onChange={(e) => update("status", e.target.value as LeadDTO["status"])}>
          {LEAD_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select
          id="priority"
          value={value.priority}
          onChange={(e) => update("priority", e.target.value as LeadDTO["priority"])}
        >
          {LEAD_PRIORITIES.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="followUpDate">Follow-up date</Label>
        <Input
          id="followUpDate"
          type="datetime-local"
          value={value.followUpDate}
          onChange={(e) => update("followUpDate", e.target.value)}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" value={value.message} onChange={(e) => update("message", e.target.value)} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
