"""Relationship graph builder for investigation visualization."""
from app.core.logging_config import logger


def build_graph(parsed, auth, iocs, ip_enrichments, threat_intel, domain_analyses):
    nodes = []
    edges = []
    seen_nodes = set()

    sender = auth.get("from_address", "")
    if sender:
        _add_node(nodes, seen_nodes, f"sender:{sender}", "sender", sender, "high" if auth.get("domain_mismatch") else "unknown", {"email": sender, "from_domain": auth.get("from_domain")})
        from_domain = auth.get("from_domain", "")
        if from_domain:
            _add_node(nodes, seen_nodes, f"domain:{from_domain}", "domain", from_domain, "unknown", {"domain": from_domain})
            _add_edge(edges, f"sender:{sender}", f"domain:{from_domain}", "uses")

    return_path = auth.get("return_path", "")
    if return_path and return_path != sender:
        rp_domain = auth.get("return_path_domain", "")
        if rp_domain:
            _add_node(nodes, seen_nodes, f"domain:{rp_domain}", "domain", rp_domain, "suspicious" if auth.get("domain_mismatch") else "unknown", {"domain": rp_domain})
            _add_edge(edges, f"sender:{sender}", f"domain:{rp_domain}", "return_path_mismatch" if auth.get("domain_mismatch") else "uses")

    for ioc in iocs:
        if ioc.ioc_type == "ip":
            _add_node(nodes, seen_nodes, f"ip:{ioc.value}", "ip", ioc.value, "unknown", {"ip": ioc.value, "source": ioc.source})
        elif ioc.ioc_type == "domain":
            _add_node(nodes, seen_nodes, f"domain:{ioc.value}", "domain", ioc.value, "unknown", {"domain": ioc.value, "source": ioc.source})
        elif ioc.ioc_type == "url":
            _add_node(nodes, seen_nodes, f"url:{ioc.value}", "url", ioc.value[:60], "unknown", {"url": ioc.value, "source": ioc.source})

    for enrich in ip_enrichments:
        ip_id = f"ip:{enrich.get('ip_address', '')}"
        if enrich.get("asn"):
            _add_node(nodes, seen_nodes, f"asn:{enrich['asn']}", "asn", enrich["asn"], "unknown", {"asn": enrich["asn"], "org": enrich.get("org")})
            _add_edge(edges, ip_id, f"asn:{enrich['asn']}", "belongs_to")
        if enrich.get("country"):
            _add_node(nodes, seen_nodes, f"country:{enrich['country']}", "country", enrich["country"], "unknown", {"country": enrich["country"]})
            _add_edge(edges, ip_id, f"country:{enrich['country']}", "located_in")

    for ti in threat_intel:
        if ti.get("status") == "malicious":
            target_type = ti.get("ioc_type", "unknown")
            target_id = f"{target_type}:{ti.get('ioc_value', '')}"
            for node in nodes:
                if node["id"] == target_id:
                    node["risk"] = "malicious"
                    break

    logger.info("Graph: %d nodes, %d edges", len(nodes), len(edges))
    return {"nodes": nodes, "edges": edges}


def _add_node(nodes, seen, nid, ntype, label, risk, data):
    if nid not in seen:
        seen.add(nid)
        nodes.append({"id": nid, "type": ntype, "label": label, "risk": risk, "data": data})


def _add_edge(edges, source, target, relationship):
    eid = f"{source}-{target}-{relationship}"
    edges.append({"id": eid, "source": source, "target": target, "relationship": relationship})
