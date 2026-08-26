# MAIL TRACE

## AI-Powered Email Threat Detection & Forensic Intelligence Platform

MAIL TRACE is an AI-powered email threat detection and forensic
intelligence platform that automatically turns a suspicious email into a
complete, evidence-backed investigation report.

> **Think of MAIL TRACE as a digital detective for suspicious emails.**

## The Problem

Phishing and malicious emails are one of the most common ways attackers
attempt to steal money, passwords, and data. Suspicious emails can look
legitimate while containing fake login pages, fraudulent payment
requests, impersonation attempts, malicious links, or harmful
attachments.

Investigating one suspicious email manually requires checking the
sender, hidden technical details, links, attachments, and external
threat databases. This can take significant time and does not scale
well.

## Our Solution

MAIL TRACE takes one suspicious email and automatically turns it into a
complete, evidence-backed investigation report. It examines the
available evidence, connects findings together, explains why the email
appears dangerous or safe, and provides a clear risk score.

## How It Works

1.  **Upload** --- Upload a suspicious email file.
2.  **Read the fingerprints** --- Analyze hidden technical email
    information to help determine origin and authenticity.
3.  **Find the clues** --- Extract sender addresses, URLs, domains, IPs,
    attachments, technical markers, and hashes as indicators.
4.  **Check known threats** --- Cross-check indicators against live
    threat intelligence sources.
5.  **Locate the source** --- Provide approximate country, region,
    provider, and ASN information for suspicious public internet
    addresses.
6.  **AI assessment** --- Review the evidence together and explain why
    the email appears dangerous or safe.
7.  **Risk score** --- Combine available evidence into a 0--100 score
    with Low, Medium, High, or Critical severity.
8.  **Visual map** --- Show relationships between senders, domains,
    URLs, IPs, and destinations.
9.  **Report** --- Generate a professional investigation report for
    record-keeping or security-team handoff.

## Key Features

-   Automated suspicious-email analysis
-   Email metadata and authentication analysis
-   SPF, DKIM, and DMARC analysis
-   IOC extraction
-   Live threat intelligence checks
-   IP geolocation/enrichment
-   Attachment analysis and hashes
-   AI-assisted risk assessment and explanation
-   0--100 risk scoring
-   Received-mail-hop analysis
-   Relationship graph visualization
-   Professional investigation reporting

## Investigation Output

A typical investigation can include:

-   Email metadata
-   Sender and recipient information
-   SPF / DKIM / DMARC results
-   Reply-To and Return-Path analysis
-   Extracted IOCs
-   Threat intelligence results
-   IP enrichment
-   Attachment information
-   Received hops
-   AI assessment
-   Risk score
-   Recommended actions
-   Relationship graph

## What Makes MAIL TRACE Different?

Many security tools focus on one part of an email investigation, such as
spam filtering or checking a single URL.

MAIL TRACE connects multiple pieces of evidence into **one
investigation** and explains the reasoning behind the result. It works
like a complete investigation rather than a single isolated filter.

## Who It Helps?

### Small & Medium Businesses

Helps organizations without an in-house security team investigate
suspicious emails with evidence.

### Security Teams / SOC Analysts

Helps reduce first-stage investigation time so analysts can focus on
complex cases.

### IT Support Staff

Helps teams provide evidence-backed guidance about suspicious emails.

### Students & Researchers

Provides a practical way to learn how real-world email threat
investigations work.

## Real-World Example

An employee receives an email that appears to be from their bank and
asks them to verify their account through a link. They upload it to MAIL
TRACE.

The platform can combine multiple pieces of evidence and produce a
result such as:

**Risk Level: CRITICAL --- 94/100**

The investigation can explain that the email failed a technical
authenticity check, the link leads to a fake login website, and the
hosting infrastructure has been associated with previous scam reports.
Recommended actions can include avoiding the link, reporting and
deleting the email, and warning other staff.

## Transparency & Limitations

MAIL TRACE supports the investigation process but does not replace a
trained security professional for complex or high-stakes cases.

IP/location enrichment provides approximate internet-infrastructure
context. It is not exact GPS tracking and cannot identify an attacker's
precise physical location.

External threat-intelligence and AI services may have availability or
rate-limit limitations.

## Future Scope

-   Support for more email formats
-   Bulk analysis of entire inboxes
-   Automatic sharing of confirmed threats with industry-standard threat
    intelligence networks
-   Integration with company security systems
-   Browser extension for instant email-link checks

## Project Vision

**Turn suspicious emails into understandable, evidence-backed forensic
investigations --- quickly.**

MAIL TRACE brings email metadata, indicators, threat intelligence,
enrichment, AI reasoning, risk scoring, and visual relationships
together into one investigation workflow.

------------------------------------------------------------------------

**Made by Team - TRACEx**
