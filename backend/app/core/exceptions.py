"""Custom exception classes."""


class ThreatIntelError(Exception):
    pass


class EmailParsingError(ThreatIntelError):
    pass


class EnrichmentError(ThreatIntelError):
    pass


class VirusTotalError(EnrichmentError):
    pass


class ClaudeAPIError(EnrichmentError):
    pass


class DatabaseError(ThreatIntelError):
    pass


class ReportGenerationError(ThreatIntelError):
    pass
