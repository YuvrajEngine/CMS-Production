import { Web } from "@pnp/sp/presets/all";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { ICmsProductionProps } from "../../components/ICmsProductionProps";

export interface ISPCRUDOPS {
    getData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<any>;
    getAllData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<any>;
    getRootData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<any>;
    insertData(listName: string, data: any, props: ICmsProductionProps): Promise<any>;
    updateData(listName: string, itemId: number, data: any, props: ICmsProductionProps): Promise<any>;
    deleteData(listName: string, itemId: number, props: ICmsProductionProps): Promise<any>;
    getListInfo(listName: string, props: ICmsProductionProps): Promise<any>;
    getListData(listName: string, columnsToRetrieve: string, props: ICmsProductionProps): Promise<any>;
    batchInsert(listName: string, data: any, props: ICmsProductionProps): Promise<any>;
    batchUpdate(listName: string, data: any, props: ICmsProductionProps): Promise<any>;
    batchDelete(listName: string, data: any, props: ICmsProductionProps): Promise<any>;
    createFolder(listName: string, folderName: string, props: ICmsProductionProps): Promise<any>;
    uploadFile(folderServerRelativeUrl: string, file: File, props: ICmsProductionProps): Promise<any>;
    deleteFile(fileServerRelativeUrl: string, props: ICmsProductionProps): Promise<any>;
    currentProfile(props: ICmsProductionProps): Promise<any>;
    getLoggedInSiteGroups(props: ICmsProductionProps): Promise<any>;
    getAllSiteGroups(props: ICmsProductionProps): Promise<any>;
    getTopData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string
        , orderby: { column: string, isAscending: boolean }, top: number, props: ICmsProductionProps): Promise<any>;
    addAttchmentInList(data: File, listName: string, itemId: number, fileName: string, props: ICmsProductionProps): Promise<any>;
    deleteAttachmentFromList(listName: string, itemId: number, fileName: string, props: ICmsProductionProps): Promise<any>;
    getAttachments(listName: string, itemId: number, props: ICmsProductionProps): Promise<any>;
}

class SPCRUDOPSImpl implements ISPCRUDOPS {
    async getData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<any> {
        if (!props.currentSPContext || !props.currentSPContext.pageContext) {
            throw new Error('SharePoint context is not available');
        }
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        let items = web.lists.getByTitle(listName).items;
        if (columnsToRetrieve) {
            items = items.select(columnsToRetrieve);
        }
        if (columnsToExpand) {
            items = items.expand(columnsToExpand);
        }
        if (filters) {
            items = items.filter(filters);
        }
        if (orderby) {
            items = items.orderBy(orderby.column, orderby.isAscending);
        }
        return await items.getAll();
    }

    async getAllData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string; isAscending: boolean }, props: ICmsProductionProps): Promise<any[]> {

        if (!props.currentSPContext || !props.currentSPContext.pageContext) {
            throw new Error("SharePoint context is not available");
        }

        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        let itemsQuery = web.lists.getByTitle(listName).items;

        if (columnsToRetrieve) {
            itemsQuery = itemsQuery.select(
                ...columnsToRetrieve.split(",").map(f => f.trim())
            );
        }

        if (columnsToExpand) {
            itemsQuery = itemsQuery.expand(
                ...columnsToExpand.split(",").map(f => f.trim())
            );
        }

        if (filters) {
            itemsQuery = itemsQuery.filter(filters);
        }

        if (orderby) {
            itemsQuery = itemsQuery.orderBy(orderby.column, orderby.isAscending);
        }

        let page = await itemsQuery.top(100).getPaged();
        let results = page.results;

        while (page.hasNext) {
            page = await page.getNext();
            results = results.concat(page.results);
        }

        return results;
    }

    async getRootData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string, orderby: { column: string, isAscending: boolean }, props: ICmsProductionProps): Promise<any> {
        if (!props.currentSPContext || !props.currentSPContext.pageContext) {
            throw new Error('SharePoint context is not available');
        }
        const fullUrl = props.currentSPContext.pageContext.web.absoluteUrl;
        const parts = fullUrl.split('/');
        const baseUrl = parts.slice(0, 5).join('/');
        const web = Web(baseUrl);
        let items = web.lists.getByTitle(listName).items;
        if (columnsToRetrieve) {
            items = items.select(columnsToRetrieve);
        }
        if (columnsToExpand) {
            items = items.expand(columnsToExpand);
        }
        if (filters) {
            items = items.filter(filters);
        }
        if (orderby) {
            items = items.orderBy(orderby.column, orderby.isAscending);
        }
        return await items.getAll();
    }

    async insertData(listName: string, data: any, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.lists.getByTitle(listName).items.add(data);
    }

    async updateData(listName: string, itemId: number, data: any, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.lists.getByTitle(listName).items.getById(itemId).update(data);
    }

    async deleteData(listName: string, itemId: number, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.lists.getByTitle(listName).items.getById(itemId).delete();
    }

    async getListInfo(listName: string, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.lists.getByTitle(listName).get();
    }

    async getListData(listName: string, columnsToRetrieve: string, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        let items = web.lists.getByTitle(listName).items;
        if (columnsToRetrieve) {
            items = items.select(columnsToRetrieve);
        }
        return await items.get();
    }

    async batchInsert(listName: string, data: any, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        const entityTypeFullName = await web.lists.getByTitle(listName).getListItemEntityTypeFullName();
        const batch = web.createBatch();
        data.forEach((item: any) => {
            web.lists.getByTitle(listName).items.inBatch(batch).add(item, entityTypeFullName);
        });
        return await batch.execute();
    }

    async batchUpdate(listName: string, data: any, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        const batch = web.createBatch();
        data.forEach((item: any) => {
            web.lists.getByTitle(listName).items.getById(item.Id).inBatch(batch).update(item);
        });
        return await batch.execute();
    }

    async batchDelete(listName: string, data: any, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        const batch = web.createBatch();
        data.forEach((item: any) => {
            web.lists.getByTitle(listName).items.getById(item.Id).inBatch(batch).delete();
        });
        return await batch.execute();
    }

    async createFolder(listName: string, folderName: string, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.lists.getByTitle(listName).rootFolder.folders.addUsingPath(folderName);
    }

    async uploadFile(folderServerRelativeUrl: string, file: File, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.getFolderByServerRelativeUrl(folderServerRelativeUrl).files.add(file.name, file, true);
    }

    async deleteFile(fileServerRelativeUrl: string, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.getFileByServerRelativeUrl(fileServerRelativeUrl).delete();
    }

    async currentProfile(props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.currentUser.get();
    }

    async getLoggedInSiteGroups(props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.currentUser.groups.get();
    }

    async getAllSiteGroups(props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.siteGroups.get();
    }

    async getTopData(listName: string, columnsToRetrieve: string, columnsToExpand: string, filters: string
        , orderby: { column: string, isAscending: boolean }, top: number, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        let items = web.lists.getByTitle(listName).items;
        if (columnsToRetrieve) {
            items = items.select(columnsToRetrieve);
        }
        if (columnsToExpand) {
            items = items.expand(columnsToExpand);
        }
        if (filters) {
            items = items.filter(filters);
        }
        if (orderby) {
            items = items.orderBy(orderby.column, orderby.isAscending);
        }
        if (top) {
            items = items.top(top);
        }
        return await items.get();
    }

    async addAttchmentInList(data: File, listName: string, itemId: number, fileName: string, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.lists.getByTitle(listName).items.getById(itemId).attachmentFiles.add(fileName, data);
    }

    async deleteAttachmentFromList(listName: string, itemId: number, fileName: string, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);
        return await web.lists.getByTitle(listName).items.getById(itemId).attachmentFiles.getByName(fileName).delete();
    }

    async getAttachments(listName: string, itemId: number, props: ICmsProductionProps): Promise<any> {
        const web = Web(props.currentSPContext.pageContext.web.absoluteUrl);

        return await web.lists
            .getByTitle(listName)
            .items.getById(itemId)
            .attachmentFiles.get();
    }

}


export default function SPCRUDOPS(): Promise<ISPCRUDOPS> {
    return Promise.resolve(new SPCRUDOPSImpl());
}