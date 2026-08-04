document.addEventListener("DOMContentLoaded", () => {
	// ==========================================
	// 1. STATE VARIABLES FOR PARTICLE & AUDIO
	// ==========================================
	let heartInterval = null;  // Stores the timer for spawning floating hearts
	const bgMusic = document.getElementById("bgMusic");
	const muteBtn = document.getElementById("muteBtn");
	const soundOnIcon = document.getElementById("soundOnIcon");
	const soundOffIcon = document.getElementById("soundOffIcon");
	let isMuted = false;
	let userInteracted = false;

	// Background music play trigger
	function playMusic() {
		if (!isMuted && bgMusic.paused) {
			bgMusic.play().catch(err => console.log("Autoplay blocked by browser policy:", err));
		}
	}


	// Play music on first interaction
	document.body.addEventListener("click", () => {
		if (!userInteracted) {
			userInteracted = true;
			playMusic();
		}
	}, { once: false });

	// Mute/Unmute Toggle
	muteBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		isMuted = !isMuted;
		if (isMuted) {
			bgMusic.pause();
			soundOnIcon.style.display = "none";
			soundOffIcon.style.display = "block";
		} else {
			soundOnIcon.style.display = "block";
			soundOffIcon.style.display = "none";
			bgMusic.play().catch(err => console.log("Playback failed:", err));
		}
	});



	// ==========================================
	// 2. ENVELOPE CONTROLLER CLASS
	// ==========================================
	class EnvelopeController {
		constructor(config) {
			this.sectionId = config.sectionId;
			this.sectionElement = document.getElementById(config.sectionId);
			this.envelopeWrapper = document.getElementById(config.envelopeId);
			this.cardsContainer = this.envelopeWrapper.querySelector(".cards");
			this.openBtn = document.getElementById(config.openBtnId);
			this.prevBtn = document.getElementById(config.prevBtnId);
			this.nextBtn = document.getElementById(config.nextBtnId);
			this.closeBtn = document.getElementById(config.closeBtnId);
			this.overlay = document.getElementById(config.overlayId);
			this.overlayInner = document.getElementById(config.overlayInnerId);
			this.overlayTitle = document.getElementById(config.overlayTitleId);
			this.overlayText = document.getElementById(config.overlayTextId);

			this.onCardOpened = config.onCardOpened || null;
			this.cards = Array.from(this.cardsContainer.querySelectorAll(".card"));
			this.animating = false;

			this.init();
		}

		init() {
			this.updateIndices();
			this.setupEventListeners();
		}

		openEnvelope() {
			if (this.envelopeWrapper.classList.contains("open")) return;

			this.envelopeWrapper.classList.add("open");
			this.envelopeWrapper.classList.add("opening");
			this.sectionElement.classList.add("envelope-is-open");

			// Centering and Zoom transition: Collapse other sections
			const container = document.querySelector(".container");
			container.classList.add("envelope-open");
			document.querySelectorAll(".section").forEach((sec) => {
				if (sec.id !== this.sectionId) {
					sec.classList.add("hidden-sibling");
				}
			});

			this.hideOverlay();
			startHeartRain();

			// Remove 'opening' delay class after transition completes (1.5 seconds)
			setTimeout(() => {
				this.envelopeWrapper.classList.remove("opening");
			}, 1500);
		}

		closeEnvelope() {
			if (!this.envelopeWrapper.classList.contains("open")) return;

			this.envelopeWrapper.classList.remove("open");
			this.envelopeWrapper.classList.remove("opening");
			this.sectionElement.classList.remove("envelope-is-open");

			// Restore side-by-side view: Expand other sections
			const container = document.querySelector(".container");
			container.classList.remove("envelope-open");
			document.querySelectorAll(".section").forEach((sec) => {
				sec.classList.remove("hidden-sibling");
			});

			this.hideOverlay();
			stopHeartRain();
		}

		updateIndices() {
			this.cards = Array.from(this.cardsContainer.querySelectorAll(".card"));
			this.cards.forEach((card, index) => {
				card.dataset.index = (index + 1).toString();
				card.classList.remove("flip-out-next", "flip-in-prev", "highlight");
			});
		}

		showOverlay(card) {
			const title = card.querySelector("h2")?.textContent || "";
			const text = card.querySelector("p")?.textContent || "";
			this.overlayTitle.textContent = title;
			this.overlayText.textContent = text;
			this.overlay.classList.add("show");
			this.overlay.setAttribute("aria-hidden", "false");

			if (this.onCardOpened) {
				this.onCardOpened(title);
			}
		}

		hideOverlay() {
			if (this.overlay) {
				this.overlay.classList.remove("show");
				this.overlay.setAttribute("aria-hidden", "true");
			}
		}

		setupEventListeners() {
			// Click envelope wrapper to open (only if closed)
			this.envelopeWrapper.addEventListener("click", (e) => {
				if (e.target.closest(".overlay") || e.target.closest(".control")) return;
				if (!this.envelopeWrapper.classList.contains("open")) {
					this.openEnvelope();
				}
			});

			// Open Button click
			if (this.openBtn) {
				this.openBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					this.openEnvelope();
				});
			}

			// Close Button click
			if (this.closeBtn) {
				this.closeBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					this.closeEnvelope();
				});
			}

			// Next Card click
			if (this.nextBtn) {
				this.nextBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					if (this.animating) return;

					this.cards = Array.from(this.cardsContainer.querySelectorAll(".card"));
					if (this.cards.length <= 1) return;

					this.animating = true;
					const topCard = this.cards[0];

					if (this.overlay && this.overlay.classList.contains("show")) this.hideOverlay();

					topCard.classList.add("flip-out-next");

					const onAnimationEnd = () => {
						topCard.removeEventListener("animationend", onAnimationEnd);
						topCard.classList.remove("flip-out-next");
						this.cardsContainer.appendChild(topCard);
						this.updateIndices();

						const newTop = this.cardsContainer.querySelector('.card[data-index="1"]');
						if (newTop) {
							newTop.classList.add("highlight");
							setTimeout(() => newTop.classList.remove("highlight"), 300);
						}
						this.animating = false;
					};

					topCard.addEventListener("animationend", onAnimationEnd);
				});
			}

			// Prev Card click
			if (this.prevBtn) {
				this.prevBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					if (this.animating) return;

					this.cards = Array.from(this.cardsContainer.querySelectorAll(".card"));
					if (this.cards.length <= 1) return;

					this.animating = true;
					const lastCard = this.cards[this.cards.length - 1];

					if (this.overlay && this.overlay.classList.contains("show")) this.hideOverlay();

					lastCard.classList.add("flip-in-prev");
					this.cardsContainer.insertBefore(lastCard, this.cardsContainer.firstChild);

					const onAnimationEnd = () => {
						lastCard.removeEventListener("animationend", onAnimationEnd);
						lastCard.classList.remove("flip-in-prev");
						this.updateIndices();

						const newTop = this.cardsContainer.querySelector('.card[data-index="1"]');
						if (newTop) {
							newTop.classList.add("highlight");
							setTimeout(() => newTop.classList.remove("highlight"), 300);
						}
						this.animating = false;
					};

					lastCard.addEventListener("animationend", onAnimationEnd);
				});
			}

			// Overlay zoom card click
			this.cards.forEach((card) => {
				card.addEventListener("click", (e) => {
					e.stopPropagation();
					if (!this.envelopeWrapper.classList.contains("open")) return;
					this.showOverlay(card);
				});
			});

			// Hide overlay clicks
			if (this.overlay) {
				this.overlay.addEventListener("click", () => {
					this.hideOverlay();
				});
			}

			if (this.overlayInner) {
				this.overlayInner.addEventListener("click", (e) => {
					e.stopPropagation();
					this.hideOverlay();
				});
			}
		}
	}

	// ==========================================
	// 3. HEART PARTICLE SYSTEM
	// ==========================================
	function createHeart(isBurst = false) {
		const heart = document.createElement("div");
		heart.className = "floating-heart";

		heart.innerHTML = `
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
			</svg>
		`;

		const size = Math.random() * 20 + 10;
		heart.style.width = `${size}px`;
		heart.style.height = `${size}px`;

		const colors = ["#f7b3cd", "#f2a4c0", "#ff6b8b", "#ff8da1", "#e695b4"];
		heart.style.color = colors[Math.floor(Math.random() * colors.length)];

		if (isBurst) {
			const activeEnvelope = document.querySelector(".section.active .envelope-wrapper");
			const envelopeRect = activeEnvelope ? activeEnvelope.getBoundingClientRect() : null;
			const startX = envelopeRect ? (envelopeRect.left + envelopeRect.width / 2) : (window.innerWidth / 2);
			const startY = envelopeRect ? (envelopeRect.top + envelopeRect.height / 2) : (window.innerHeight / 2);

			heart.style.left = `${startX}px`;
			heart.style.top = `${startY}px`;

			const angle = Math.random() * Math.PI * 2;
			const velocity = Math.random() * 180 + 60;
			const tx = Math.cos(angle) * velocity;
			const ty = Math.sin(angle) * velocity - 80;

			heart.style.setProperty("--tx", `${tx}px`);
			heart.style.setProperty("--ty", `${ty}px`);
			heart.classList.add("burst");
		} else {
			const startX = Math.random() * window.innerWidth;
			heart.style.left = `${startX}px`;
			heart.style.top = `${window.innerHeight + 20}px`;

			const tx = (Math.random() - 0.5) * 200;
			const ty = -(window.innerHeight + 100);

			heart.style.setProperty("--tx", `${tx}px`);
			heart.style.setProperty("--ty", `${ty}px`);
			heart.classList.add("float-up");
		}

		const duration = Math.random() * 3 + (isBurst ? 1.5 : 3.5);
		heart.style.animationDuration = `${duration}s`;

		document.body.appendChild(heart);

		setTimeout(() => {
			heart.remove();
		}, duration * 1000);
	}

	function startHeartRain() {
		for (let i = 0; i < 40; i++) {
			createHeart(true);
		}

		if (!heartInterval) {
			heartInterval = setInterval(() => {
				createHeart(false);
			}, 300);
		}
	}

	function stopHeartRain() {
		if (heartInterval) {
			clearInterval(heartInterval);
			heartInterval = null;
		}
		document.querySelectorAll(".floating-heart").forEach((h) => h.remove());
	}

	// ==========================================
	// 4. APOLOGY ACCEPT LOGIC
	// ==========================================
	const totalSorryCards = 3;
	const openedSorryCards = new Set();
	const sorryCountSpan = document.getElementById("sorryCount");
	const dinoSpeechBubble = document.getElementById("dinoSpeechBubble");

	function triggerApologyAcceptanceState() {
		dinoSpeechBubble.innerHTML = `
			You read all of them! Forgive me? 👉👈
			<button id="acceptBtn" class="accept-btn">Accept ❤️</button>
		`;

		const acceptBtn = document.getElementById("acceptBtn");
		acceptBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			acceptApology();
		});
	}

	function acceptApology() {
		// Burst hearts
		for (let i = 0; i < 65; i++) {
			createHeart(true);
		}

		dinoSpeechBubble.innerHTML = `Yay! Thank you, Mutu! I love you! ❤️`;

		setTimeout(() => {
			sorryController.closeEnvelope();
		}, 1500);
	}

	// ==========================================
	// 5. INITIALIZATION
	// ==========================================
	window.sorryController = new EnvelopeController({
		sectionId: "sorrySection",
		envelopeId: "sorryEnvelopeWrapper",
		openBtnId: "sorryOpenBtn",
		prevBtnId: "sorryPrevBtn",
		nextBtnId: "sorryNextBtn",
		closeBtnId: "sorryCloseBtn",
		overlayId: "sorryCardOverlay",
		overlayInnerId: "sorryOverlayInner",
		overlayTitleId: "sorryOverlayTitle",
		overlayTextId: "sorryOverlayText",
		onCardOpened: (cardTitle) => {
			openedSorryCards.add(cardTitle);
			sorryCountSpan.textContent = openedSorryCards.size.toString();

			if (openedSorryCards.size === totalSorryCards) {
				triggerApologyAcceptanceState();
			}
		}
	});

	window.mainController = new EnvelopeController({
		sectionId: "mainSection",
		envelopeId: "envelopeWrapper",
		openBtnId: "openBtn",
		prevBtnId: "prevBtn",
		nextBtnId: "nextBtn",
		closeBtnId: "closeBtn",
		overlayId: "cardOverlay",
		overlayInnerId: "overlayInner",
		overlayTitleId: "overlayTitle",
		overlayTextId: "overlayText"
	});
});
