import SPCRUDOPS from "../DAL/spcrudops";
import { ICmsProductionProps } from "../../components/ICmsProductionProps";

export interface IBPRSMaster {
    Id?: number;
    Title: string;
    VINCutOff: string;
    BreakPointDT: string;
    CMSSrNo: number;
    Status: string;
    WF: string;
    Stage: number;
    Summary: string;
    Ageing: string;
}

export interface IBPRSMasterBAL {
    getAllBPRSData(props: ICmsProductionProps): Promise<IBPRSMaster[]>;
    getBPRSDataByFilter(filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<IBPRSMaster[]>;
    getBPRSDataById(itemId: number, props: ICmsProductionProps): Promise<IBPRSMaster | null>;
    addBPRSData(data: Partial<IBPRSMaster>, props: ICmsProductionProps): Promise<any>;
    updateBPRSData(itemId: number, data: Partial<IBPRSMaster>, props: ICmsProductionProps): Promise<any>;
    deleteBPRSData(itemId: number, props: ICmsProductionProps): Promise<any>;
    batchAddBPRSData(data: Partial<IBPRSMaster>[], props: ICmsProductionProps): Promise<any>;
    batchUpdateBPRSData(data: IBPRSMaster[], props: ICmsProductionProps): Promise<any>;
    batchDeleteBPRSData(data: IBPRSMaster[], props: ICmsProductionProps): Promise<any>;
}

class BPRSMasterImpl implements IBPRSMasterBAL {
    private readonly listName: string = "BPRS_List";
    private readonly columns: string = "Id,Title,VINCutOff,BreakPointDT,CMSSrNo,Status,WF,Stage,Summary,Ageing";

    async getAllBPRSData(props: ICmsProductionProps): Promise<IBPRSMaster[]> {
        const spOps = await SPCRUDOPS();
        return await spOps.getAllData(this.listName, this.columns, "", "", { column: "Id", isAscending: true }, props);
    }

    async getBPRSDataByFilter(filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<IBPRSMaster[]> {
        const spOps = await SPCRUDOPS();
        return await spOps.getAllData(this.listName, this.columns, "", filters, orderby, props);
    }

    async getBPRSDataById(itemId: number, props: ICmsProductionProps): Promise<IBPRSMaster | null> {
        const spOps = await SPCRUDOPS();
        const filters = `Id eq ${itemId}`;
        const result = await spOps.getData(this.listName, this.columns, "", filters, { column: "Id", isAscending: true }, props);
        return result && result.length > 0 ? result[0] : null;
    }

    async addBPRSData(data: Partial<IBPRSMaster>, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.insertData(this.listName, data, props);
    }

    async updateBPRSData(itemId: number, data: Partial<IBPRSMaster>, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.updateData(this.listName, itemId, data, props);
    }

    async deleteBPRSData(itemId: number, props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.deleteData(this.listName, itemId, props);
    }

    async batchAddBPRSData(data: Partial<IBPRSMaster>[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchInsert(this.listName, data, props);
    }

    async batchUpdateBPRSData(data: IBPRSMaster[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchUpdate(this.listName, data, props);
    }

    async batchDeleteBPRSData(data: IBPRSMaster[], props: ICmsProductionProps): Promise<any> {
        const spOps = await SPCRUDOPS();
        return await spOps.batchDelete(this.listName, data, props);
    }
}

export default function BPRSMaster(): Promise<IBPRSMasterBAL> {
    return Promise.resolve(new BPRSMasterImpl());
}