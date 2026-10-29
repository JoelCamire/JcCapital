/* Capsule 2 — CELIAPP. Sources des chiffres : voir scripts.md */
VIDEOS.celiapp = {
  label: 'CAPSULE · CELIAPP',
  scenes: [
    { d: 4.2, name: 'Accroche', draw(lt) {
      kicker('QUESTION', lt, 560);
      words('Une épargne *déductible* et retirée *sans~impôt~?*', MX, 720, { size: 100, t0: 0.15, stagger: 0.09 }, lt);
      stamp('Ça existe.', W / 2, 1270, 170, lt, 2.5);
    } },
    { d: 8, name: 'Ce que c’est', draw(lt) {
      kicker('CE QUE C’EST', lt, 430);
      const p = E.out3(prog(lt, 0.1, 0.7));
      text('CELIAPP', MX - 4, 640 + (1 - p) * 60, { weight: 800, size: 190, gold: true, glow: 40, alpha: p, ls: 2 });
      words('Compte d’épargne libre d’impôt pour l’achat d’une première propriété', MX, 730, { size: 50, weight: 500, color: C.beige, t0: 0.6, stagger: 0.05, lh: 1.2 }, lt);
      const q = prog(lt, 1.6, 1.4);
      halo(W / 2, 1060, 190, q);
      icon('house', W / 2, 1060, 220, q, { lw: 7 });
      words('Pour mettre de côté la mise de fonds de votre *première maison.*', MX, 1340, { size: 70, t0: 2.6, stagger: 0.06 }, lt);
    } },
    { d: 8, name: 'Mécanisme 1', draw(lt) {
      kicker('MÉCANISME 1 · LES PLAFONDS', lt, 430);
      const a = E.out5(prog(lt, 0.2, 1.2));
      if (lt > 0.2) big(fmt(8000 * a) + ' $', MX - 6, 680, 170);
      mono('PAR ANNÉE', MX, 750, { alpha: E.out3(prog(lt, 0.8, 0.5)) });
      // 5 blocs de 8 000 $
      const n = 5, gap = 14, bw = (CW - gap * (n - 1)) / n, y = 830, h = 130, t0 = 1.6, step = 0.4;
      let filled = 0;
      for (let i = 0; i < n; i++) {
        const p = prog(lt, t0 + i * step, 0.45); filled += E.out3(p);
        const x = MX + i * (bw + gap);
        ctx.save(); rrect(x, y, bw, h, 14); ctx.strokeStyle = 'rgba(198,172,143,0.35)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        if (p > 0) {
          ctx.save(); ctx.globalAlpha *= E.out3(p);
          rrect(x, y + h * (1 - E.out3(p)), bw, h * E.out3(p), 14); ctx.fillStyle = goldGrad(y, y + h); ctx.fill(); ctx.restore();
          text('8 000 $', x + bw / 2, y + h / 2 + 12, { size: 32, weight: 800, color: C.bg0, align: 'center', alpha: E.out3(prog(lt, t0 + i * step + 0.2, 0.3)) });
        }
      }
      if (lt > t0) big(fmt(8000 * filled) + ' $', MX - 6, 1180, 170);
      mono('À VIE', MX, 1250, { alpha: E.out3(prog(lt, 3.6, 0.5)) });
      words('Le compte peut rester ouvert jusqu’à *15~ans.*', MX, 1400, { size: 60, weight: 500, t0: 4.0, stagger: 0.06 }, lt);
    } },
    { d: 8.2, name: 'Mécanisme 2', draw(lt) {
      kicker('MÉCANISME 2 · DOUBLE AVANTAGE', lt, 430);
      card(MX - 20, 520, CW + 40, 330, prog(lt, 0.2, 0.6));
      icon('arrowDown', MX + 70, 640, 90, prog(lt, 0.5, 0.6), { lw: 7 });
      mono('À L’ENTRÉE', MX + 150, 625, { alpha: E.out3(prog(lt, 0.5, 0.5)) });
      words('Cotisation *déductible* de votre revenu imposable.', MX + 150, 715, { size: 58, weight: 500, maxW: CW - 190, t0: 0.7, stagger: 0.05 }, lt);
      card(MX - 20, 900, CW + 40, 330, prog(lt, 2.8, 0.6));
      icon('arrowUp', MX + 70, 1020, 90, prog(lt, 3.1, 0.6), { lw: 7 });
      mono('À LA SORTIE', MX + 150, 1005, { alpha: E.out3(prog(lt, 3.1, 0.5)) });
      words('Retrait admissible pour l’achat : *non~imposable.*', MX + 150, 1095, { size: 58, weight: 500, maxW: CW - 190, t0: 3.3, stagger: 0.05 }, lt);
      words('Exemple : 8 000 $ cotisés réduisent votre revenu imposable de 8 000 $.', MX, 1360, { size: 50, weight: 500, color: C.beige, t0: 5.0, stagger: 0.04 }, lt);
    } },
    { d: 8, name: 'Mécanisme 3', draw(lt) {
      kicker('MÉCANISME 3 · LE REPORT', lt, 430);
      words('Droits inutilisés ? Reportés, *jusqu’à 8~000~$.*', MX, 580, { size: 70, t0: 0.15, stagger: 0.07 }, lt);
      const base = 1250, sc = 360 / 16000, bw = 300;
      const x1 = MX + 60, x2 = MX + CW - 60 - bw;
      // Année 1 : 8 000 $ disponibles, rien cotisé (contour pointillé)
      const p1 = E.out3(prog(lt, 1.2, 0.7));
      if (p1 > 0) {
        ctx.save(); ctx.globalAlpha *= p1; ctx.setLineDash([12, 10]); ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
        rrect(x1, base - 8000 * sc, bw, 8000 * sc, 12); ctx.stroke(); ctx.restore();
        text('0 $ cotisé', x1 + bw / 2, base - 8000 * sc / 2 + 14, { size: 40, weight: 800, color: C.beige, align: 'center', alpha: p1 });
      }
      mono('ANNÉE 1', x1 + bw / 2, base + 50, { align: 'center', alpha: p1, color: C.beige });
      // flèche de report
      const pa = E.inOut3(prog(lt, 2.0, 0.8));
      if (pa > 0) {
        ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.globalAlpha *= 0.9;
        const ax1 = x1 + bw + 20, ax2 = x2 - 20, ay = base - 8000 * sc / 2;
        ctx.beginPath(); ctx.moveTo(ax1, ay); ctx.lineTo(ax1 + (ax2 - ax1) * pa, ay); ctx.stroke();
        if (pa > 0.95) { ctx.beginPath(); ctx.moveTo(ax2 - 18, ay - 14); ctx.lineTo(ax2, ay); ctx.lineTo(ax2 - 18, ay + 14); ctx.stroke(); }
        ctx.restore();
      }
      // Année 2 : 8 000 $ nouveaux + 8 000 $ reportés
      const pb = prog(lt, 2.6, 0.7), pc = prog(lt, 3.2, 0.7);
      vbar(x2, base, bw, 8000 * sc, pb, { r: 12 });
      if (pc > 0) {
        const hh = 8000 * sc * E.out3(pc);
        ctx.save(); ctx.fillStyle = 'rgba(198,172,143,0.45)'; rrect(x2, base - 8000 * sc - hh - 6, bw, hh, 12); ctx.fill(); ctx.restore();
      }
      text('nouveaux', x2 + bw / 2, base - 8000 * sc / 2 + 14, { size: 36, weight: 800, color: C.bg0, align: 'center', alpha: E.out3(prog(lt, 3.0, 0.4)) });
      text('reportés', x2 + bw / 2, base - 8000 * sc * 1.5 + 8, { size: 36, weight: 800, color: C.text, align: 'center', alpha: E.out3(prog(lt, 3.6, 0.4)) });
      mono('ANNÉE 2', x2 + bw / 2, base + 50, { align: 'center', alpha: E.out3(pb), color: C.beige });
      if (lt > 3.2) text(fmt(8000 + 8000 * E.out3(pc)) + ' $', x2 + bw / 2, base - 16000 * sc - 40, { size: 64, weight: 800, gold: true, align: 'center', glow: 30 });
      words('Exemple : rien cotisé l’année d’ouverture ? Jusqu’à 16~000~$ l’année suivante.', MX, 1420, { size: 54, weight: 500, t0: 4.0, stagger: 0.045 }, lt);
    } },
    { d: 9, name: 'Pour qui', draw(lt) {
      kicker('POUR QUI', lt, 430);
      words('Pour ouvrir un CELIAPP :', MX, 590, { size: 84, t0: 0.15, stagger: 0.08 }, lt);
      checklist(['18 ans ou plus, résident du Canada', 'Acheteur d’une première habitation'], MX, 820, 160, lt, 0.9, 0.9, { size: 56 });
      card(MX - 20, 1150, CW + 40, 320, prog(lt, 2.8, 0.6));
      words('Ni vous ni votre conjoint n’avez été propriétaire de la maison où vous habitiez, cette année ou les *4~années précédentes.*', MX + 30, 1240, { size: 50, weight: 500, maxW: CW - 60, t0: 3.1, stagger: 0.045, lh: 1.2 }, lt);
    } },
    { d: 8, name: 'Erreur fréquente', draw(lt) {
      kicker('ERREUR FRÉQUENTE', lt, 430);
      halo(MX + 90, 620, 120, prog(lt, 0.1, 0.8));
      icon('warning', MX + 90, 616, 150, prog(lt, 0.1, 0.9), { lw: 7 });
      words('Attendre d’avoir un projet pour *ouvrir le compte.*', MX, 860, { size: 84, t0: 0.5, stagger: 0.08 }, lt);
      card(MX - 20, 1170, CW + 40, 300, prog(lt, 2.6, 0.6));
      words('Les droits commencent à s’accumuler *seulement à l’ouverture.*', MX + 30, 1270, { size: 62, weight: 500, maxW: CW - 60, t0: 2.9, stagger: 0.05 }, lt);
    } },
    { d: 6.1, name: 'Fin', draw(lt) { endScene(lt); } }
  ]
};
