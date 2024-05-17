import { Injectable } from "@angular/core";
import { Classnames } from "../common/classnames.model";
import { Document } from "../models/document.model";
import { ParseDataService } from "./data.service";
import Parse from 'parse';
import { BehaviorSubject } from "rxjs";


@Injectable({
    providedIn: 'root'
})
export class DocumentService extends ParseDataService<Document>
{
    constructor() {
        super(Classnames.Document);
        this.startLiveQuery = false;
    }
    public async getDocumentsByProcedureId(id: string): Promise<Document[]> {
        const query = new Parse.Query(Classnames.JudicialProcedure.classname);
        query.equalTo('objectId', id);
        query.include("documents");
        const result = await query.first();
        if (!result) return [];
        const documents = result.get("documents");
        return this.mapParseArrayOfAttributesToEntityObject(documents);
    }

    public async getDocumentsByCustomerId(customerId: string): Promise<Document[]> {
        const query = new Parse.Query(Classnames.Document.classname);
        query.equalTo('customer', { "__type": "Pointer", "className": Classnames.Customer.classname, "objectId": customerId });
        query.equalTo('template', true);
        const documents = await query.find();

        // Check if documents are defined before mapping
        if (!documents) {
            console.error('No documents found for the specified customer ID and template status');
            return [];
        }
        return this.mapParseArrayOfAttributesToEntityObject(documents);
    }
}

@Injectable({
    providedIn: 'root'
})
export class DocumentGeneratorHelperService {

    constructor(private _judicialProcedureService: JudicialProceduresService, private _decretoIngiuntivoService: DecretoIngiuntivoService,
        private _precettoService: PrecettiService,
        private _esecuzioniMobiliareService: EsecuzioniMobiliareService,
        private _contenziosoOrdinarioService: ContenziosoOrdinarioService, private _contenziosoRitoOrdinarioService: ContenziosoRitoOrdinarioService, private _contenziosoRitoSemplificatoService: ContenziosoRitoSemplificatoService) { }

    private async getPrecettoDIPEInterface(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPrecettoHelper = { ...documentData$.value };

        const precettoHelper = new PrecettoDIPEHelper(dataAsPrecettoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        await precettoHelper.loadDI(this._decretoIngiuntivoService, procedure).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            })

        return precettoHelper as GeneratedDocumentsHelper;
    }

    private async getPrecettoBaseInterface(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPrecettoHelper = { ...documentData$.value };

        const precettoHelper = new PrecettoBaseHelper(dataAsPrecettoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        await precettoHelper.loadDI(this._decretoIngiuntivoService, procedure).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        return precettoHelper as GeneratedDocumentsHelper;
    }

    public async getPrecettoRinnovo(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPrecettoHelper = { ...documentData$.value };

        const precettoHelper = new PrecettoInRinnovoHelper(dataAsPrecettoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        await precettoHelper.loadDI(this._decretoIngiuntivoService, procedure).then(() => {

        },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        await precettoHelper.loadPrecettoNotificato(this._precettoService).then(() => {

        },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del precetto notificato.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });


        return precettoHelper as GeneratedDocumentsHelper;
    }

    public async getPrecettoSuODA(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPrecettoHelper = { ...documentData$.value };

        const precettoHelper = new PrecettoSuOda(dataAsPrecettoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        await precettoHelper.loadDI(this._decretoIngiuntivoService, procedure).then(() => {

        },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });


        await precettoHelper.loadPrecettoNotificato(this._precettoService).then(() => {

        },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del precetto notificato.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        await precettoHelper.loadEM(this._esecuzioniMobiliareService, procedure).then(() => {
        },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento dell'esecuzione mobiliare.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });

        return precettoHelper as GeneratedDocumentsHelper;
    }

    public async getPrecettoSuSentenzaDiCondanna(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPrecettoHelper = { ...documentData$.value };

        const precettoHelper = new PrecettoSuSentenzaDiCondannaHelper(dataAsPrecettoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        await precettoHelper.loadDI(this._decretoIngiuntivoService, procedure).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        await precettoHelper.loadPrecettoNotificato(this._precettoService).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del precetto notificato.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        await precettoHelper.loadContropartiContenzioso([this._contenziosoOrdinarioService, this._contenziosoRitoOrdinarioService, this._contenziosoRitoSemplificatoService]).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento delle controparti del contenzioso.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        await precettoHelper.loadContenzioso([this._contenziosoOrdinarioService, this._contenziosoRitoOrdinarioService, this._contenziosoRitoSemplificatoService]).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del contenzioso.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });

        return precettoHelper as GeneratedDocumentsHelper;
    }

    public async getPrecettoSuOrdinanza702bis(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPrecettoHelper = { ...documentData$.value };

        const precettoHelper = new PrecettoSuOrdinanza702bis(dataAsPrecettoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        await precettoHelper.loadContenzioso([this._contenziosoOrdinarioService, this._contenziosoRitoOrdinarioService as any as ContenziosoService<any>, this._contenziosoRitoSemplificatoService as any as ContenziosoService<any>], procedure).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            })

        return precettoHelper as GeneratedDocumentsHelper;
    }

    public async getPrecettoSuSentenzaDiConfermaDI(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPrecettoHelper = { ...documentData$.value };

        const precettoHelper = new PrecettoSuSentenzaDiConfermaDIHelper(dataAsPrecettoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        await precettoHelper.loadDI(this._decretoIngiuntivoService, procedure).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        await precettoHelper.loadContropartiContenzioso([this._contenziosoOrdinarioService, this._contenziosoRitoOrdinarioService, this._contenziosoRitoSemplificatoService]).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento delle controparti del contenzioso.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });
        await precettoHelper.loadContenzioso([this._contenziosoOrdinarioService, this._contenziosoRitoOrdinarioService, this._contenziosoRitoSemplificatoService]).then(() => { },
            (err) => {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento del contenzioso.",
                    footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                    customClass: {
                        confirmButton: 'btn btn-primary'
                    },
                });
            });

        return precettoHelper as GeneratedDocumentsHelper;
    }

    public async getPignoramentoPressoTerzi(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAsPignoramentoHelper = { ...documentData$.value };

        const pignoramentoHelper = new PignoramentoPressoTerziHelper(dataAsPignoramentoHelper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        if (procedure.precetti && procedure.precetti.length > 0) {
            await pignoramentoHelper.loadPrecetto(this._precettoService, procedure).then(() => { },
                (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Errore",
                        text: "Si è verificato un errore durante il caricamento del precetto.",
                        footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        },
                    });
                })
        }

        if (procedure.decretoIngiuntivo && procedure.decretoIngiuntivo.length > 0) {
            await pignoramentoHelper.loadDI(this._decretoIngiuntivoService, procedure).then(() => { },
                (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Errore",
                        text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                        footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        },
                    });
                });
        }
        if (procedure.contenzioso && procedure.contenzioso.length > 0) {
            await pignoramentoHelper.loadContenzioso([this._contenziosoOrdinarioService, this._contenziosoRitoOrdinarioService as any as ContenziosoService<any>, this._contenziosoRitoSemplificatoService as any as ContenziosoService<any>], procedure).then(() => { },
                (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Errore",
                        text: "Si è verificato un errore durante il caricamento del contenzioso.",
                        footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        },
                    });
                })
        }

        if (procedure.esecuzioneMobiliare && procedure.esecuzioneMobiliare.length > 0) {
            await pignoramentoHelper.loadEM(this._esecuzioniMobiliareService, procedure).then(() => { },
                (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Errore",
                        text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                        footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        },
                    });
                });
        }

        if (procedure.generatedDocuments) {
            await pignoramentoHelper.loadGeneratedPrecetto(this._judicialProcedureService, procedure).then(() => { },
                (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Errore",
                        text: "Si è verificato un errore durante il caricamento del precetto generato.",
                        footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        },
                    });
                });
        }
        return pignoramentoHelper as GeneratedDocumentsHelper;
    }

    public async get543(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        const dataAs543Helper = { ...documentData$.value };

        const ex543Helper = new s543Helper(dataAs543Helper);

        const procedure = await this._judicialProcedureService.fetchObjectByIdIfNeeded(procedureId).then((res) => {
            if (!res) {
                Swal.fire({
                    icon: "error",
                    title: "Errore",
                    text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                });
                throw new Error("Pratica non trovata");
            }

            return res as JudicialProcedure;
        }).catch((err) => {
            Swal.fire({
                icon: "error",
                title: "Errore",
                text: "Si è verificato un errore durante il caricamento della pratica di riferimento.",
                footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                customClass: {
                    confirmButton: 'btn btn-primary'
                },
            });
            console.error(err);
            throw new Error("Pratica non trovata");
        });

        if (procedure.generatedDocuments) {
            await ex543Helper.loadGeneratedPignoramento(this._judicialProcedureService, procedure).then(() => { },
                (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Errore",
                        text: "Si è verificato un errore durante il caricamento del pignoramento generato.",
                        footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        },
                    });
                });
        }

        if (procedure.decretoIngiuntivo && procedure.decretoIngiuntivo.length > 0) {
            await ex543Helper.loadDI(this._decretoIngiuntivoService, procedure).then(() => { },
                (err) => {
                    Swal.fire({
                        icon: "error",
                        title: "Errore",
                        text: "Si è verificato un errore durante il caricamento del decreto ingiuntivo.",
                        footer: "<b>Allega il seguente codice all'assistenza: </b>" + err.code + " - " + err.message,
                        customClass: {
                            confirmButton: 'btn btn-primary'
                        },
                    });
                });
        }

        return ex543Helper as GeneratedDocumentsHelper;
    }

    public async getGeneratedDocumentHelper(documentData$: BehaviorSubject<GeneratedDocumentsHelper>, procedureId: string): Promise<GeneratedDocumentsHelper> {
        let interfaceToUse: GeneratedDocumentsHelper;
        if (documentData$.value.type === 'Precetto') {
            if (documentData$.value.subtype === 'Precetto D.I. P.E.')
                interfaceToUse = await this.getPrecettoDIPEInterface(documentData$, procedureId);
            else if (documentData$.value.subtype === 'Precetto BASE')
                interfaceToUse = await this.getPrecettoBaseInterface(documentData$, procedureId);
            else if (documentData$.value.subtype === 'Precetto IN RINNOVO')
                interfaceToUse = await this.getPrecettoRinnovo(documentData$, procedureId);
            else if (documentData$.value.subtype === 'Precetto SU ODA')
                interfaceToUse = await this.getPrecettoSuODA(documentData$, procedureId);
            else if (documentData$.value.subtype === 'Precetto SU SENTENZA DI CONDANNA')
                interfaceToUse = await this.getPrecettoSuSentenzaDiCondanna(documentData$, procedureId);
            else if (documentData$.value.subtype === 'Precetto SU SENTENZA DI CONFERMA D.I.')
                interfaceToUse = await this.getPrecettoSuSentenzaDiConfermaDI(documentData$, procedureId);
            else if (documentData$.value.subtype === 'Precetto SU ORDINANZA 702bis')
                interfaceToUse = await this.getPrecettoSuOrdinanza702bis(documentData$, procedureId);
            else
                interfaceToUse = {} as GeneratedDocumentsHelper;
        } else if (documentData$.value.type === 'Pignoramento') {
            if (documentData$.value.subtype === 'Pignoramento presso Terzi')
                interfaceToUse = await this.getPignoramentoPressoTerzi(documentData$, procedureId);
            else
                interfaceToUse = {} as GeneratedDocumentsHelper;
        } else if (documentData$.value.type === '543') {
            if (documentData$.value.subtype === 'Avviso Ex Art. 543 c.p.c.')
                interfaceToUse = await this.get543(documentData$, procedureId);
            else
                interfaceToUse = {} as GeneratedDocumentsHelper;
        } else if (documentData$.value.type === 'Decreto Ingiuntivo') {
            interfaceToUse = {} as GeneratedDocumentsHelper;
        } else {
            throw new Error(`Unknown document type: ${documentData$.value.type}`);
        }
        return interfaceToUse;
    }
}